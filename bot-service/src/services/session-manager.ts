import path from "path"
import { Boom } from "@hapi/boom"
import makeWASocket, { Browsers, DisconnectReason } from "@whiskeysockets/baileys"
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"
import { logger } from "../utils/logger.js"
import { env } from "../utils/env.js"
import { loadAuthState, AUTH_ROOT } from "../utils/session.js"
import { getApiClient } from "./api-client.js"

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
  state: SessionState
  authDir: string
  alreadyPaired: boolean // prevent multiple pairing code requests
}

const sessions = new Map<string, SessionData>()

// ── Public API ──────────────────────────────────────────────────────────────

export function getSessionState(userId: string): SessionState | null {
  return sessions.get(userId)?.state ?? null
}

export async function connectQR(userId: string): Promise<void> {
  const session = getOrCreate(userId)
  session.alreadyPaired = false
  session.state = { userId, status: "connecting" }
  await startSocket(userId)
}

export async function connectPairing(userId: string, phone: string): Promise<void> {
  const session = getOrCreate(userId)
  session.alreadyPaired = false
  session.state = { userId, status: "connecting", pairingCode: undefined }
  // Store phone for pairing code request after socket connects
  await startSocket(userId, phone)
}

export async function disconnect(userId: string): Promise<void> {
  const session = sessions.get(userId)
  if (!session) return
  session.state = { userId, status: "disconnected" }
  notifyClients(userId)
  // Socket will be closed by Baileys when we stop sending keepalives
}

export async function deleteSession(userId: string): Promise<void> {
  sessions.delete(userId)
  notifyClients(userId)
}

// ── Internal ────────────────────────────────────────────────────────────────

function getOrCreate(userId: string): SessionData {
  let session = sessions.get(userId)
  if (!session) {
    session = {
      authDir: path.join(AUTH_ROOT, userId),
      alreadyPaired: false,
      state: { userId, status: "offline" },
    }
    sessions.set(userId, session)
  }
  return session
}

async function startSocket(userId: string, pairingPhone?: string): Promise<void> {
  const session = getOrCreate(userId)
  session.state = { userId, status: "connecting" }
  notifyClients(userId)

  try {
    const { state: authState, saveCreds } = await loadAuthState(userId)
    const registered = (authState.creds as { registered?: boolean }).registered ?? false
    logger.info({ userId, registered, authDir: session.authDir }, "[AUTH] Starting socket")

    // Proxy agent if configured
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

    logger.info({ userId }, "[WA] Creating socket")
    const sock = makeWASocket({
      auth: authState,
      agent,
      browser: Browsers.ubuntu("HfzBot"),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 30000,
      maxMsgRetryCount: 3,
      fireInitQueries: true,
      emitOwnEvents: true,
    })

    // ── Auth persistence ──
    sock.ev.on("creds.update", () => {
      saveCreds().catch(e => logger.error({ e }, "[AUTH] Failed to save creds"))
    })

    // ── Connection updates ──
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      // Send QR to frontend
      if (qr && !registered) {
        logger.info({ userId }, "[WA] QR received")
        session.state = { userId, status: "connecting", qr }
        notifyClients(userId)
      }

      if (connection === "connecting") {
        logger.info({ userId }, "[WA] Connecting...")
        session.state = { ...session.state, status: "connecting" }
        notifyClients(userId)
      }

      if (connection === "open") {
        logger.info({ userId }, "[WA] Connection opened")
        session.state = {
          userId,
          status: "online",
          lastConnectedAt: new Date(),
        }
        notifyClients(userId)
        notifyBackend(userId, "online")
      }

      if (connection === "close") {
        const error = lastDisconnect?.error as Boom | undefined
        const statusCode = error?.output?.statusCode
        const message = error?.message ?? "Unknown"

        logger.info({ userId, statusCode, message }, "[WA] Connection closed")

        // Logged out — session invalid, need re-link
        if (statusCode === DisconnectReason.loggedOut) {
          logger.warn({ userId }, "[WA] Logged out — removing session")
          sessions.delete(userId)
          notifyClients(userId)
          notifyBackend(userId, "disconnected")
          return
        }

        // Temporary disconnect — reconnect with backoff
        session.state = { userId, status: "disconnected", error: message }
        notifyClients(userId)

        // Attempt reconnection for non-logged-out disconnects
        setTimeout(() => {
          if (sessions.has(userId)) {
            logger.info({ userId }, "[WA] Reconnecting...")
            startSocket(userId, pairingPhone).catch(e =>
              logger.error({ e, userId }, "[WA] Reconnect failed")
            )
          }
        }, 3000)
      }
    })

    // ── Pairing code (request once, after socket ready, if not registered) ──
    if (pairingPhone && !registered && !session.alreadyPaired) {
      session.alreadyPaired = true
      // Wait for socket to be ready before requesting pairing code
      const waitForOpen = async () => {
        try {
          const code = await sock.requestPairingCode(pairingPhone)
          logger.info({ userId, code: `${code.slice(0, 3)}...` }, "[WA] Pairing code received")
          session.state = { userId, status: "connecting", pairingCode: code }
          notifyClients(userId)
        } catch (err) {
          logger.error({ err, userId }, "[WA] Pairing code request failed")
          session.state = { ...session.state, error: "Gagal mendapatkan kode pairing" }
          notifyClients(userId)
        }
      }
      // Check registered status periodically
      if (!registered) {
        waitForOpen()
      }
    }
  } catch (error) {
    logger.error({ error, userId }, "[WA] Socket creation failed")
    session.state = { userId, status: "disconnected", error: String(error) }
    notifyClients(userId)
  }
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

function notifyBackend(userId: string, status: string): void {
  try {
    getApiClient().updateBotStatus(userId, status).catch(() => {})
  } catch { /* ignore */ }
}
