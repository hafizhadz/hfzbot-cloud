import http from "http"
import { WebSocketServer, WebSocket } from "ws"

import { env } from "./utils/env"
import { logger } from "./utils/logger"
import { registerCommands } from "./commands"
import { connectQR, connectPairing, disconnect, deleteSession, getSessionState, subscribe } from "./services/session-manager"
import { getApiClient } from "./services/api-client"

registerCommands()

// ── Backend API client ─────────────────────────────────────────────────────────

if (env.BACKEND_API_URL && env.BOT_API_KEY && env.BACKEND_BOT_ID) {
  getApiClient()
  logger.info({ url: env.BACKEND_API_URL }, "Backend API client initialised")
} else {
  logger.warn("Backend API not configured")
}

// ── HTTP + WebSocket Server ────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${env.HEALTH_PORT}`)

  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") {
    res.writeHead(204); res.end(); return
  }

  // ── POST /connect/:userId — QR connect ──
  const connectMatch = req.method === "POST" && url.pathname.match(/^\/connect\/(.+)$/)
  if (connectMatch) {
    const userId = connectMatch[1]
    connectQR(userId).catch(err => logger.error({ err, userId }, "Connect failed"))
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, message: "Connecting", userId }))
    return
  }

  // ── POST /pairing/:userId — Pairing connect ──
  const pairingMatch = req.method === "POST" && url.pathname.match(/^\/pairing\/(.+)$/)
  if (pairingMatch) {
    const userId = pairingMatch[1]
    let body = ""
    req.on("data", (chunk) => { body += chunk })
    req.on("end", async () => {
      try {
        const { phone } = JSON.parse(body)
        if (!phone || phone.length < 10) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Nomor tidak valid" }))
          return
        }
        await connectPairing(userId, phone)
        // Wait up to 10s for pairing code
        for (let i = 0; i < 20; i++) {
          const state = getSessionState(userId)
          if (state?.pairingCode) {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: true, pairingCode: state.pairingCode, userId }))
            return
          }
          await new Promise(r => setTimeout(r, 500))
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ ok: true, message: "Meminta kode pairing...", userId }))
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Format salah" }))
      }
    })
    return
  }

  // ── POST /disconnect/:userId ──
  const disconnectMatch = req.method === "POST" && url.pathname.match(/^\/disconnect\/(.+)$/)
  if (disconnectMatch) {
    const userId = disconnectMatch[1]
    await disconnect(userId)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, message: "Disconnected", userId }))
    return
  }

  // ── DELETE /session/:userId ──
  const deleteMatch = req.method === "DELETE" && url.pathname.match(/^\/session\/(.+)$/)
  if (deleteMatch) {
    const userId = deleteMatch[1]
    await deleteSession(userId)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, message: "Session deleted", userId }))
    return
  }

  // ── GET /status/:userId ──
  const statusMatch = req.method === "GET" && url.pathname.match(/^\/status\/(.+)$/)
  if (statusMatch) {
    const userId = statusMatch[1]
    const state = getSessionState(userId)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(state ?? { userId, status: "offline" }))
    return
  }

  // ── GET /health — health check ──
  if (url.pathname === "/health" || url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "alive", service: env.BOT_NAME, uptime: process.uptime() }))
    return
  }

  // ── 404 ──
  res.writeHead(404); res.end("Not found")
})

// ── WebSocket ──────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server })
const wsMap = new Map<string, Set<WebSocket>>()

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", `http://localhost:${env.HEALTH_PORT}`)
  const userId = url.searchParams.get("userId")
  if (!userId) { ws.close(); return }

  if (!wsMap.has(userId)) wsMap.set(userId, new Set())
  wsMap.get(userId)!.add(ws)
  logger.info({ userId }, "WS client connected")

  // Send current state immediately
  const state = getSessionState(userId)
  if (state) ws.send(JSON.stringify(state))

  // Subscribe to future updates using the session manager
  const unsub = subscribe(userId, (newState) => {
    try { ws.send(JSON.stringify(newState)) } catch { /* ignore */ }
  })

  ws.on("close", () => {
    wsMap.get(userId)?.delete(ws)
    unsub()
    logger.info({ userId }, "WS client disconnected")
  })
})

server.listen(env.HEALTH_PORT, () => {
  logger.info({ port: env.HEALTH_PORT }, "Bot service listening")
})

// ── Graceful Shutdown ──────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down")
  wss.close()
  server.close()
  process.exit(0)
}
process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))

// ── Unhandled errors ──────────────────────────────────────────────────────────

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection — preventing crash")
})

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception")
  process.exit(1)
})
