import path from "path"
import { Boom } from "@hapi/boom"
import makeWASocket, { Browsers, DisconnectReason } from "@whiskeysockets/baileys"
import type { WASocket } from "@whiskeysockets/baileys"
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"
import { logger } from "../utils/logger.js"
import { env } from "../utils/env.js"
import { loadAuthState, AUTH_ROOT } from "../utils/session.js"
import { getApiClient } from "./api-client.js"

// ── Types ──────────────────────────────────────────────────────────────────────

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
  userId: string
  state: SessionState
  authDir: string
  socket: WASocket | null
  pairingPhone?: string
  pairingRequested: boolean
  reconnectAttempts: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

// ── Registry ────────────────────────────────────────────────────────────────────

const sessions = new Map<string, SessionData>()

// ── Public API ──────────────────────────────────────────────────────────────────

export function getSessionState(userId: string): SessionState | null {
  return sessions.get(userId)?.state ?? null
}

export async function connectQR(userId: string): Promise<void> {
  await ensureSession(userId)
  await startSocket(userId)
}

export async function connectPairing(userId: string, phone: string): Promise<void> {
  await ensureSession(userId)
  const session = sessions.get(userId)!
  session.pairingPhone = phone
  session.pairingRequested = false
  session.state = { userId, status: "connecting" }
  notifyClients(userId)
  await startSocket(userId)
}

export async function disconnect(userId: string): Promise<void> {
  const session = sessions.get(userId)
  if (!session) return
  stopReconnect(session)
  destroySocket(session)
  session.state = { userId, status: "disconnected" }
  notifyClients(userId)
}

export async function deleteSession(userId: string): Promise<void> {
  const session = sessions.get(userId)
  if (session) {
    stopReconnect(session)
    destroySocket(session)
  }
  sessions.delete(userId)
  notifyClients(userId)
}

// ── Internal ────────────────────────────────────────────────────────────────────

function ensureSession(userId: string): SessionData {
  let session = sessions.get(userId)
  if (!session) {
    session = {
      userId,
      state: { userId, status: "offline" },
      authDir: path.join(AUTH_ROOT, userId),
      socket: null,
      pairingRequested: false,
      reconnectAttempts: 0,
      reconnectTimer: null,
    }
    sessions.set(userId, session)
    logger.info({ userId, authDir: session.authDir }, "[SESSION] Created")
  }
  return session
}

function destroySocket(session: SessionData): void {
  if (session.socket) {
    const userId = session.userId
    logger.info({ userId }, "[SOCKET] Destroying")
    try {
      ;(session.socket as unknown as { end: (err?: Error) => void }).end(undefined)
    } catch { /* ignore */ }
    session.socket = null
  }
}

function stopReconnect(session: SessionData): void {
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer)
    session.reconnectTimer = null
    session.reconnectAttempts = 0
  }
}

// ── Socket Lifecycle ────────────────────────────────────────────────────────────

async function startSocket(userId: string): Promise<void> {
  const session = sessions.get(userId)
  if (!session) return

  // Stop pending reconnection
  stopReconnect(session)

  // Destroy existing socket if any (ensure single socket per user)
  if (session.socket) {
    logger.info({ userId }, "[SOCKET] Closing existing socket before new connection")
    destroySocket(session)
  }

  session.state = { userId, status: "connecting" }
  notifyClients(userId)

  try {
    const { state: authState, saveCreds } = await loadAuthState(userId)
    const registered = (authState.creds as { registered?: boolean }).registered ?? false
    logger.info({ userId, registered, authDir: session.authDir }, "[AUTH] Loaded")

    // Proxy agent
    let agent: HttpsProxyAgent<string> | SocksProxyAgent | undefined
    if (env.PROXY_ENABLED === "true" && env.PROXY_URL) {
      try {
        agent = env.PROXY_URL.startsWith("socks")
          ? new SocksProxyAgent(env.PROXY_URL)
          : new HttpsProxyAgent(env.PROXY_URL)
        logger.info({ proxy: env.PROXY_URL }, "[WA] Using proxy")
      } catch (err) {
        logger.error({ err }, "[WA] Proxy agent failed")
      }
    }

    logger.info({ userId }, "[SOCKET] Creating")
    const sock = makeWASocket({
      auth: authState,
      agent,
      browser: Browsers.ubuntu("HfzBot"),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: env.CONNECT_TIMEOUT_MS,
      keepAliveIntervalMs: env.KEEP_ALIVE_INTERVAL_MS,
    })

    session.socket = sock
    logger.info({ userId }, "[SOCKET] Registered")

    // ── Auth persistence ──
    sock.ev.on("creds.update", () => {
      saveCreds().catch(e => logger.error({ e, userId }, "[AUTH] Save failed"))
    })

    // ── Connection updates ──
    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
      if (qr && !registered) {
        logger.info({ userId }, "[QR] Received")
        session.state = { userId, status: "connecting", qr }
        notifyClients(userId)
      }

      if (connection === "connecting") {
        logger.info({ userId }, "[CONNECTION] Connecting")
        session.state = { ...session.state, status: "connecting" }
        notifyClients(userId)
      }

      if (connection === "open") {
        logger.info({ userId }, "[CONNECTION] Open — online")
        session.reconnectAttempts = 0
        session.state = {
          userId,
          status: "online",
          lastConnectedAt: new Date(),
        }
        notifyClients(userId)
        notifyBackend(userId, "online")
      }

      if (connection === "close") {
        const boom = lastDisconnect?.error as Boom | undefined
        const statusCode = boom?.output?.statusCode
        const message = boom?.message ?? "Unknown"
        logger.info({ userId, statusCode, message }, "[CONNECTION] Closed")

        // Determine if session is permanently invalid
        const isPermanent = statusCode === DisconnectReason.loggedOut
          || statusCode === DisconnectReason.badSession
          || statusCode === DisconnectReason.multideviceMismatch

        if (isPermanent) {
          logger.warn({ userId, statusCode }, "[AUTH] Session invalid — remove")
          destroySocket(session)
          sessions.delete(userId)
          session.state = { userId, status: "disconnected", error: "Session expired — re-link WhatsApp" }
          notifyClients(userId)
          notifyBackend(userId, "disconnected")
          return
        }

        // Temporary — schedule reconnect with exponential backoff
        session.state = { userId, status: "disconnected", error: message }
        notifyClients(userId)
        scheduleReconnect(userId)
      }
    })

    // ── Pairing code ──
    if (session.pairingPhone && !registered && !session.pairingRequested) {
      session.pairingRequested = true
      requestPairingCode(sock, userId, session.pairingPhone).catch(e =>
        logger.error({ e, userId }, "[PAIRING] Failed")
      )
    }
  } catch (error) {
    logger.error({ error, userId }, "[SOCKET] Creation failed")
    session.state = { userId, status: "disconnected", error: String(error) }
    notifyClients(userId)
  }
}

// ── Reconnection ────────────────────────────────────────────────────────────────

function scheduleReconnect(userId: string): void {
  const session = sessions.get(userId)
  if (!session) return

  session.reconnectAttempts++
  const attempt = session.reconnectAttempts
  const maxRetries = env.MAX_RETRIES

  if (attempt > maxRetries) {
    logger.warn({ userId, attempt, maxRetries }, "[RECONNECT] Max retries reached — stopping")
    session.state = { ...session.state, error: "Max reconnection attempts reached" }
    notifyClients(userId)
    return
  }

  // Exponential backoff: 3s, 6s, 12s, 24s, 48s... capped at 60s
  const delay = Math.min(3000 * Math.pow(2, attempt - 1), 60000)
  logger.info({ userId, attempt, delayMs: delay }, "[RECONNECT] Scheduling")

  session.reconnectTimer = setTimeout(() => {
    if (sessions.has(userId)) {
      logger.info({ userId, attempt }, "[RECONNECT] Attempting")
      startSocket(userId).catch(e =>
        logger.error({ e, userId }, "[RECONNECT] Failed")
      )
    }
  }, delay)
}

// ── Pairing Code ────────────────────────────────────────────────────────────────

async function requestPairingCode(sock: WASocket, userId: string, phone: string): Promise<void> {
  try {
    logger.info({ userId }, "[PAIRING] Requesting code")
    const code = await sock.requestPairingCode(phone)
    const session = sessions.get(userId)
    if (session) {
      const masked = `${code.slice(0, 3)}...${code.slice(-3)}`
      logger.info({ userId, code: masked }, "[PAIRING] Received")
      session.state = { userId, status: "connecting", pairingCode: code }
      notifyClients(userId)
    }
  } catch (err) {
    logger.error({ err, userId }, "[PAIRING] Request failed")
    const session = sessions.get(userId)
    if (session) {
      session.state = { ...session.state, error: "Pairing code gagal" }
      notifyClients(userId)
    }
  }
}

// ── WebSocket Clients ───────────────────────────────────────────────────────────

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

function notifyBackend(userId: string, status: string): void {
  try {
    getApiClient().updateBotStatus(userId, status).catch(() => {})
  } catch { /* ignore */ }
}
