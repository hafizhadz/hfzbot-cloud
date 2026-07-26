// ── Session Manager ─────────────────────────────────────────────────────────
// Manages multiple WhatsApp sessions, one per user.
// Each session has isolated auth state, connection, and events.

import { Boom } from "@hapi/boom"
import makeWASocket, { Browsers, DisconnectReason } from "@whiskeysockets/baileys"
import type { WASocket, WAMessage, ConnectionState, GroupMetadata } from "@whiskeysockets/baileys"
import { logger } from "../utils/logger"
import { loadAuthState } from "../utils/session"
import { getApiClient } from "./api-client"

export type BotStatus = "offline" | "connecting" | "online" | "disconnected" | "suspended"

export interface SessionState {
  userId: string
  status: BotStatus
  qr?: string
  pairingCode?: string
  error?: string
  lastConnectedAt?: Date
}

interface SessionData {
  socket: WASocket | null
  state: SessionState
  saveCreds: (() => Promise<void>) | null
  groupCache: Map<string, GroupMetadata>
  groupCacheTimer: ReturnType<typeof setInterval> | null
  running: boolean
  retryCount: number
  pairingPhone?: string
}

const sessions = new Map<string, SessionData>()
const MAX_RETRIES = 5
const RECONNECT_BASE_DELAY = 1000

function getSession(userId: string): SessionData {
  let session = sessions.get(userId)
  if (!session) {
    session = {
      socket: null,
      state: { userId, status: "offline" },
      saveCreds: null,
      groupCache: new Map(),
      groupCacheTimer: null,
      running: false,
      retryCount: 0,
    }
    sessions.set(userId, session)
  }
  return session
}

export function getSessionState(userId: string): SessionState | null {
  return sessions.get(userId)?.state ?? null
}

export function getAllSessions(): SessionState[] {
  return Array.from(sessions.values()).map(s => s.state)
}

// ── Connection Management ──────────────────────────────────────────────────

export async function connectQR(userId: string): Promise<void> {
  const session = getSession(userId)
  if (session.running) return
  session.running = true
  session.retryCount = 0
  session.pairingPhone = undefined
  session.state = { userId, status: "connecting" }
  await establish(session, userId)
}

export async function connectPairing(userId: string, phone: string): Promise<void> {
  const session = getSession(userId)
  if (session.running) return
  session.running = true
  session.retryCount = 0
  session.pairingPhone = phone
  session.state = { userId, status: "connecting" }
  await establish(session, userId)
}

export async function disconnect(userId: string): Promise<void> {
  const session = getSession(userId)
  if (!session) return
  session.running = false
  if (session.socket) {
    try {
      session.socket.end(new Boom("Disconnected by user", {
        statusCode: DisconnectReason.restartRequired,
      }))
    } catch { /* ignore */ }
    session.socket = null
  }
  clearGroupCache(session)
  session.state = { userId, status: "disconnected" }
  notifyClients(userId)
}

export async function deleteSession(userId: string): Promise<void> {
  await disconnect(userId)
  sessions.delete(userId)
  notifyClients(userId)
}

// ── Internal ───────────────────────────────────────────────────────────────

async function establish(session: SessionData, userId: string): Promise<void> {
  try {
    const { state: authState, saveCreds } = await loadAuthState(userId)
    session.saveCreds = saveCreds

    session.state = { userId, status: "connecting" }
    notifyClients(userId)

    session.socket = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      browser: Browsers.ubuntu("HfzBot"),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 30000,
      maxMsgRetryCount: 5,
      fireInitQueries: true,
      emitOwnEvents: true,
      cachedGroupMetadata: async (jid: string) => session.groupCache.get(jid),
    })

    registerHandlers(session, userId, session.socket)
  } catch (error) {
    logger.error({ error, userId }, "Failed to create socket")
    session.state = { userId, status: "disconnected", error: String(error) }
    notifyClients(userId)
    if (session.running) scheduleReconnect(session, userId)
  }
}

function registerHandlers(session: SessionData, userId: string, socket: WASocket): void {
  socket.ev.on("creds.update", () => {
    session.saveCreds?.().catch(e => logger.error({ e }, "Failed to save creds"))
  })

  socket.ev.on("connection.update", (update) => {
    handleConnectionUpdate(session, userId, update)
  })

  socket.ev.on("messages.upsert", ({ messages, type }) => {
    handleMessages(session, userId, messages, type)
  })
}

function handleConnectionUpdate(session: SessionData, userId: string, update: Partial<ConnectionState>): void {
  const { connection, lastDisconnect, qr, isNewLogin } = update

  if (qr && session.pairingPhone) {
    // Pairing mode - request pairing code
    if (session.socket) {
      session.socket.requestPairingCode(session.pairingPhone)
        .then(code => {
          session.state = { userId, status: "connecting", pairingCode: code }
          notifyClients(userId)
        })
        .catch(err => {
          logger.error({ err, userId }, "Pairing code request failed")
        })
    }
  } else if (qr) {
    // QR mode
    session.state = { userId, status: "connecting", qr }
    notifyClients(userId)
  }

  if (isNewLogin) {
    logger.info({ userId }, "New login")
  }

  if (connection === "connecting") {
    session.state = { ...session.state, status: "connecting" }
    notifyClients(userId)
  }

  if (connection === "open") {
    session.state = {
      userId,
      status: "online",
      lastConnectedAt: new Date(),
    }
    session.retryCount = 0
    notifyClients(userId)
    notifyBackend(userId, "online")
  }

  if (connection === "close") {
    const error = lastDisconnect?.error as Boom | undefined
    const statusCode = error?.output?.statusCode
    session.socket = null
    clearGroupCache(session)

    switch (statusCode) {
      case DisconnectReason.loggedOut:
      case DisconnectReason.badSession:
        session.state = { userId, status: "disconnected", error: "Session expired — re-link WhatsApp" }
        session.running = false
        notifyClients(userId)
        notifyBackend(userId, "disconnected")
        break
      default:
        session.state = { userId, status: "disconnected", error: `Connection lost: ${error?.message ?? "Unknown"}` }
        notifyClients(userId)
        if (session.running && session.retryCount < MAX_RETRIES) {
          scheduleReconnect(session, userId)
        }
        break
    }
  }
}

function scheduleReconnect(session: SessionData, userId: string): void {
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, session.retryCount)
  session.retryCount++
  logger.info({ userId, delay, retry: session.retryCount }, "Scheduling reconnect")
  setTimeout(() => {
    if (session.running) establish(session, userId)
  }, delay)
}

function handleMessages(_session: SessionData, _userId: string, _messages: WAMessage[], _type: string): void {
  // Message handling - future feature
}

function clearGroupCache(session: SessionData): void {
  if (session.groupCacheTimer) {
    clearInterval(session.groupCacheTimer)
    session.groupCacheTimer = null
  }
  session.groupCache.clear()
}

// ── WebSocket Clients ──────────────────────────────────────────────────────

type WSCallback = (state: SessionState) => void
const wsClients = new Map<string, Set<WSCallback>>()

export function subscribe(userId: string, cb: WSCallback): () => void {
  if (!wsClients.has(userId)) wsClients.set(userId, new Set())
  wsClients.get(userId)!.add(cb)
  return () => wsClients.get(userId)?.delete(cb)
}

function notifyClients(userId: string): void {
  const state = sessions.get(userId)?.state
  if (!state) return
  wsClients.get(userId)?.forEach(cb => cb(state))
}

// ── Backend Notification ──────────────────────────────────────────────────

function notifyBackend(userId: string, status: string): void {
  try {
    getApiClient().updateBotStatus(userId, status).catch(() => {})
  } catch { /* ignore */ }
}
