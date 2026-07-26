import http from "http"

import { env } from "./utils/env"
import { logger } from "./utils/logger"
import { WhatsAppBotService } from "./services/whatsapp"
import { getApiClient } from "./services/api-client"
import { registerCommands } from "./commands"

// ── Startup ────────────────────────────────────────────────────────────────────

// Register all built-in commands
registerCommands()

// ── Backend API client ─────────────────────────────────────────────────────────

// Initialise eagerly to validate env vars at startup
if (env.BACKEND_API_URL && env.BOT_API_KEY && env.BACKEND_BOT_ID) {
  getApiClient()
  logger.info(
    { url: env.BACKEND_API_URL, botId: env.BACKEND_BOT_ID },
    "Backend API client initialised",
  )
} else {
  logger.warn(
    "Backend API not configured — bot status will not be reported to backend",
  )
}

// ── Bot Service Instance ───────────────────────────────────────────────────────

/**
 * Singleton bot service instance.
 * Does NOT auto-connect — the orchestrator (API server) calls
 * `bot.connect()` when the user requests a WhatsApp pairing.
 *
 * Set AUTO_CONNECT=true in env to connect immediately on startup.
 */
export const bot = new WhatsAppBotService()

// Auto-connect if configured
if (process.env.AUTO_CONNECT === "true") {
  bot.connect().catch((error) => {
    logger.error({ error }, "Auto-connect failed")
  })
}

// ── Health-Check HTTP Server ───────────────────────────────────────────────────

/**
 * Minimal HTTP health-check endpoint for process monitoring
 * (Docker health checks, K8s liveness probes, uptime monitors).
 *
 * Responds with:
 * - 200 OK when the bot is online
 * - 503 Service Unavailable when the bot is offline/connecting/disconnected
 * - 503 with "suspended" note when the bot is suspended
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${env.HEALTH_PORT}`)

  // ── POST /connect — trigger WhatsApp pairing ──
  if (req.method === "POST" && url.pathname === "/connect") {
    try {
      if (bot.getState().status === "online") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ ok: true, message: "Already connected" }))
        return
      }
      bot.connect().catch((err) => logger.error({ err }, "Connect via API failed"))
      res.writeHead(202, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true, message: "Connecting — check QR endpoint for pairing code" }))
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: false, error: String(err) }))
    }
    return
  }

  // ── POST /disconnect — disconnect WhatsApp ──
  if (req.method === "POST" && url.pathname === "/disconnect") {
    try {
      await bot.disconnect()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true, message: "Disconnected" }))
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: false, error: String(err) }))
    }
    return
  }

  // ── GET /qr — current QR code ──
  if (req.method === "GET" && url.pathname === "/qr") {
    const state = bot.getState()
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ qr: state.qr ?? null, status: state.status }))
    return
  }

  // ── POST /pairing — connect with pairing code ──
  if (req.method === "POST" && url.pathname === "/pairing") {
    try {
      let body = ""
      req.on("data", (chunk) => { body += chunk })
      req.on("end", async () => {
        try {
          const { phone } = JSON.parse(body) as { phone: string }
          if (!phone || phone.length < 10) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: false, error: "Nomor telepon tidak valid" }))
            return
          }
          await bot.connectWithPairingCode(phone)
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ ok: true, message: "Pairing code diminta — cek log bot untuk kodenya" }))
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ ok: false, error: "Format request salah. Kirim { phone: \"62812...\" }" }))
        }
      })
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: false, error: "Internal error" }))
    }
    return
  }

  // ── GET /health — health check (default) ──
  const state = bot.getState()

  const health = {
    status: "alive",
    service: env.BOT_NAME,
    bot: {
      connection: state.status,
      lastConnectedAt: state.lastConnectedAt ?? null,
      hasError: !!state.error,
      error: state.error ?? null,
      hasQR: !!state.qr,
    },
    config: {
      backendConfigured: !!(env.BACKEND_API_URL && env.BOT_API_KEY && env.BACKEND_BOT_ID),
      healthPort: env.HEALTH_PORT,
      authDir: env.AUTH_DIR,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }

  // Determine HTTP status code
  let statusCode: number
  switch (state.status) {
    case "online":
      statusCode = 200
      break
    case "suspended":
      statusCode = 503
      break
    default:
      statusCode = 503
  }

  res.writeHead(statusCode, { "Content-Type": "application/json" })
  res.end(JSON.stringify(health, null, 2))
})

server.listen(env.HEALTH_PORT, () => {
  logger.info(
    { port: env.HEALTH_PORT },
    "Health-check server listening",
  )
})

// ── Graceful Shutdown ──────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received — cleaning up")

  // 1. Stop accepting new requests
  server.close(() => {
    logger.info("Health-check server closed")
  })

  // 2. Disconnect WhatsApp bot (graceful — saves session state)
  await bot.disconnect()

  // 3. Give pending work a moment to finish
  await sleep(500)

  logger.info("Shutdown complete")
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))

// ── Unhandled Rejection / Exception ────────────────────────────────────────────

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection")
})

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception")
  process.exit(1)
})

// ── Startup Log ───────────────────────────────────────────────────────────────

logger.info({
  name: env.BOT_NAME,
  env: env.NODE_ENV,
  healthPort: env.HEALTH_PORT,
  backendConfigured: !!(env.BACKEND_API_URL && env.BOT_API_KEY && env.BACKEND_BOT_ID),
}, "Bot service initialised — waiting for connection trigger")
logger.info("Run the bot service: npm run dev")
logger.info("Call bot.connect() or set AUTO_CONNECT=true to start WhatsApp pairing")

// ── Utility ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
