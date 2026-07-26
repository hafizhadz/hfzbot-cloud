import makeWASocket, {
  Browsers,
  DisconnectReason,
} from "@whiskeysockets/baileys"
import type { WASocket } from "@whiskeysockets/baileys"
import type { GroupMetadata } from "@whiskeysockets/baileys"
import type { ConnectionState } from "@whiskeysockets/baileys"
import type { WAMessage } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import qrcode from "qrcode-terminal"

import { env } from "../utils/env.js"
import { logger } from "../utils/logger.js"
import { loadAuthState } from "../utils/session.js"
import { handleIncomingMessage } from "./message-handler.js"
import { getApiClient } from "./api-client.js"
import { handleParticipantJoin, handleParticipantLeave } from "../modules/welcome.js"

// ── Types ──────────────────────────────────────────────────────────────────────

export type BotStatus =
  | "offline"
  | "connecting"
  | "online"
  | "disconnected"
  | "suspended"

export type ConnectionStatus = BotStatus

export interface BotConfig {
  /** Maximum reconnection attempts */
  maxRetries: number
  /** Base delay for exponential backoff (ms) */
  reconnectBaseDelay: number
  /** QR code timeout (ms) */
  qrTimeoutMs: number
  /** Whether to notify the backend of state changes */
  notifyBackend: boolean
}

export interface GroupInfo {
  jid: string
  subject: string
  size: number
  owner: string | undefined
}

export interface BotState {
  status: BotStatus
  qr?: string
  pairingCode?: string
  error?: string
  lastConnectedAt?: Date
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: BotConfig = {
  maxRetries: env.MAX_RETRIES,
  reconnectBaseDelay: env.RECONNECT_BASE_DELAY,
  qrTimeoutMs: env.QR_TIMEOUT_MS,
  notifyBackend: !!(env.BACKEND_API_URL && env.BOT_API_KEY && env.BACKEND_BOT_ID),
}

// ── Service ────────────────────────────────────────────────────────────────────

/**
 * WhatsAppBotService manages the Baileys WebSocket connection lifecycle.
 *
 * The service does NOT auto-connect on construction — call `connect()` explicitly
 * (e.g., from an API endpoint) to start the pairing flow.
 *
 * States: OFFLINE → CONNECTING → ONLINE (or back to OFFLINE on failure)
 * Additionally, SUSPENDED is used when the subscription expires.
 */
export class WhatsAppBotService {
  private socket: WASocket | null = null
  private retryCount = 0
  private running = false
  private saveCreds: (() => Promise<void>) | null = null
  private config: BotConfig
  private pairingPhone: string | undefined

  private state: BotState = {
    status: "offline",
  }

  // Group metadata cache (JID → metadata)
  private groupCache = new Map<string, GroupMetadata>()
  private groupCacheTimer: ReturnType<typeof setInterval> | null = null

  constructor(config?: Partial<BotConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Returns a snapshot of the current connection state. */
  getState(): BotState {
    return { ...this.state }
  }

  /** Shortcut — returns only the connection status string. */
  getStatus(): BotStatus {
    return this.state.status
  }

  /** Returns the most recent QR code string, if any. */
  getQR(): string | null {
    return this.state.qr ?? null
  }

  /**
   * Initialises the Baileys socket and begins the WhatsApp Web pairing flow.
   * Call this after the user requests a connection (e.g., from the dashboard).
   */
  async connect(): Promise<void> {
    if (this.state.status === "suspended") {
      logger.warn("Bot is suspended — cannot connect")
      return
    }

    if (this.running) {
      logger.warn("Bot is already connecting or connected")
      return
    }

    this.running = true
    this.retryCount = 0
    this.pairingPhone = undefined
    this.state = { status: "connecting" }

    await this.establish()
  }

  /**
   * Connect to WhatsApp using pairing code instead of QR.
   * @param phoneNumber - Full phone number with country code (e.g. 6281234567890)
   */
  async connectWithPairingCode(phoneNumber: string): Promise<void> {
    if (this.state.status === "suspended") {
      logger.warn("Bot is suspended — cannot connect")
      return
    }

    if (this.running) {
      logger.warn("Bot is already connecting or connected")
      return
    }

    this.running = true
    this.retryCount = 0
    this.pairingPhone = phoneNumber
    this.state = { status: "connecting" }

    await this.establish()
  }

  /**
   * Manually trigger reconnection.
   * Useful when the user wants to retry after a non-recoverable disconnect.
   */
  async reconnect(): Promise<void> {
    logger.info("Manual reconnection requested")

    if (this.socket) {
      try {
        this.socket.end(new Boom("Manual reconnection", {
          statusCode: DisconnectReason.restartRequired,
        }))
      } catch {
        // ignore
      }
      this.socket = null
    }

    this.running = true
    this.retryCount = 0
    this.state = { status: "connecting" }

    await this.establish()
  }

  /**
   * Suspends the bot (e.g., due to expired subscription).
   * Disconnects without reconnection; sets status to SUSPENDED.
   */
  suspend(): void {
    logger.info("Suspending bot — subscription expired")

    this.running = false
    this.state = { status: "suspended" }

    if (this.socket) {
      try {
        this.socket.end(new Boom("Bot suspended", {
          statusCode: DisconnectReason.restartRequired,
        }))
      } catch {
        // ignore
      }
      this.socket = null
    }

    this.clearGroupCache()
    void this.notifyStatusChange("suspended")
  }

  /**
   * Gracefully disconnects the Baileys socket and resets state.
   */
  async disconnect(): Promise<void> {
    this.running = false

    if (!this.socket) {
      this.state = { status: "offline" }
      this.clearGroupCache()
      return
    }

    try {
      this.socket.end(new Boom("Service shutting down", {
        statusCode: DisconnectReason.restartRequired,
      }))
    } catch (error) {
      logger.error({ error }, "Error during socket disconnect")
    }

    this.socket = null
    this.state = { status: "offline" }
    this.retryCount = 0
    this.clearGroupCache()

    logger.info("Bot disconnected")
  }

  // ── Group Operations ─────────────────────────────────────────────────────

  /**
   * Fetches all groups the bot is currently participating in.
   * Uses `groupFetchAllParticipating()` and caches the results.
   */
  async getGroups(): Promise<GroupInfo[]> {
    if (!this.socket) {
      logger.warn("Cannot get groups — socket is null")
      return []
    }

    try {
      const allGroups = await this.socket.groupFetchAllParticipating()

      // Update cache
      for (const [jid, meta] of Object.entries(allGroups)) {
        this.groupCache.set(jid, meta)
      }

      return Object.entries(allGroups).map(([jid, meta]) => ({
        jid,
        subject: meta.subject,
        size: meta.size ?? meta.participants.length,
        owner: meta.owner,
      }))
    } catch (error) {
      logger.error({ error }, "Failed to fetch groups")
      return []
    }
  }

  /**
   * Fetches metadata for a single group.
   * Uses cache if available, otherwise fetches fresh.
   */
  async getGroupMetadata(jid: string): Promise<GroupMetadata | null> {
    // Check cache first
    const cached = this.groupCache.get(jid)
    if (cached) return cached

    if (!this.socket) {
      logger.warn("Cannot get group metadata — socket is null")
      return null
    }

    try {
      const meta = await this.socket.groupMetadata(jid)
      this.groupCache.set(jid, meta)
      return meta
    } catch (error) {
      logger.error({ error, jid }, "Failed to get group metadata")
      return null
    }
  }

  // ── Send Messages ────────────────────────────────────────────────────────

  /**
   * Send a text message to a JID (individual or group).
   */
  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.socket) {
      logger.warn("Cannot send message — socket is null")
      return
    }

    try {
      await this.socket.sendMessage(jid, { text })
    } catch (error) {
      logger.error({ error, jid }, "Failed to send message")
    }
  }

  /**
   * Send a welcome message when a new participant joins a group.
   * Mentions the new participant(s).
   */
  async sendWelcomeMessage(jid: string, participant: string): Promise<void> {
    if (!this.socket) {
      logger.warn("Cannot send welcome message — socket is null")
      return
    }

    const mention = participant.split("@")[0]

    try {
      await this.socket.sendMessage(jid, {
        text: `👋 Welcome, @${mention}! 🎉\n\nWe're glad to have you here. Check out the group rules and have fun!`,
        mentions: [participant],
      })
    } catch (error) {
      logger.error({ error, jid, participant }, "Failed to send welcome message")
    }
  }

  /**
   * Send a goodbye message when a participant leaves.
   */
  async sendGoodbyeMessage(jid: string, participant: string): Promise<void> {
    if (!this.socket) return

    const mention = participant.split("@")[0]

    try {
      await this.socket.sendMessage(jid, {
        text: `👋 @${mention} has left the group.`,
        mentions: [participant],
      })
    } catch (error) {
      logger.error({ error, jid, participant }, "Failed to send goodbye message")
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async establish(): Promise<void> {
    try {
      const { state: authState, saveCreds } = await loadAuthState()
      this.saveCreds = saveCreds

      this.socket = makeWASocket({
        auth: authState,
        printQRInTerminal: false,
        browser: Browsers.ubuntu(env.BOT_NAME),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        logger,
        connectTimeoutMs: env.CONNECT_TIMEOUT_MS,
        keepAliveIntervalMs: env.KEEP_ALIVE_INTERVAL_MS,
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        emitOwnEvents: true,
        cachedGroupMetadata: async (jid: string) => {
          return this.groupCache.get(jid)
        },
      })

      this.registerHandlers(this.socket)
      this.startGroupCacheRefresh()
    } catch (error) {
      logger.error({ error }, "Failed to create Baileys socket")
      this.state = {
        status: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      }

      if (this.running) {
        await this.scheduleReconnect()
      }
    }
  }

  private registerHandlers(socket: WASocket): void {
    // ── Auth persistence (MANDATORY) ────────────────────────────────────────
    socket.ev.on("creds.update", () => {
      this.saveCreds?.().catch((error) => {
        logger.error({ error }, "Failed to save credentials")
      })
    })

    // ── Connection lifecycle ─────────────────────────────────────────────────
    socket.ev.on("connection.update", (update) => {
      this.handleConnectionUpdate(update)
    })

    // ── Incoming messages ────────────────────────────────────────────────────
    socket.ev.on("messages.upsert", ({ messages, type }) => {
      this.handleMessagesUpsert(messages, type)
    })

    // ── Group participant changes ────────────────────────────────────────────
    socket.ev.on("group-participants.update", (event) => {
      this.handleGroupParticipantsUpdate(event)
    })

    // ── Group metadata changes ──────────────────────────────────────────────
    socket.ev.on("groups.update", (updates) => {
      for (const g of updates) {
        if (g.id) {
          // Invalidate cache entry so it refetches next time
          this.groupCache.delete(g.id)
        }
        if (g.subject) {
          logger.info({ jid: g.id, subject: g.subject }, "Group subject changed")
        }
      }
    })
  }

  // ── Connection Update Handler ────────────────────────────────────────────

  private async handleConnectionUpdate(
    update: Partial<ConnectionState>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr, isNewLogin } = update

    // ── QR code received ─────────────────────────────────────────────────
    if (qr) {
      this.state.qr = qr
      this.state.status = "connecting"

      // Render QR in terminal for debugging
      qrcode.generate(qr, { small: true })
      logger.info("New QR code generated — scan with WhatsApp")

      // Notify backend
      if (this.config.notifyBackend) {
        void this.notifyQRGenerated(qr)
      }
    }

    if (isNewLogin) {
      logger.info("New login detected — QR was scanned successfully")
    }

    // ── Connecting ────────────────────────────────────────────────────────
    if (connection === "connecting") {
      this.state.status = "connecting"
      logger.info("Connecting to WhatsApp...")
      
      // If pairing phone is set, request pairing code instead of waiting for QR
      if (this.pairingPhone && this.socket) {
        try {
          const code = await this.socket.requestPairingCode(this.pairingPhone)
          this.state.pairingCode = code
          logger.info({ code }, "Pairing code generated")
          
          // Notify backend
          if (this.config.notifyBackend) {
            void this.notifyQRGenerated(code) // reuse webhook for pairing code
          }
        } catch (err) {
          logger.error({ err }, "Failed to request pairing code")
        }
      }
    }

    // ── Connected (open) ─────────────────────────────────────────────────
    if (connection === "open") {
      this.state.status = "online"
      this.state.qr = undefined
      this.state.error = undefined
      this.state.lastConnectedAt = new Date()
      this.retryCount = 0

      logger.info("Connected to WhatsApp")
      void this.notifyStatusChange("online")
    }

    // ── Connection closed ────────────────────────────────────────────────
    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined
      const statusCode = error?.output?.statusCode
      const message = error?.message ?? "Unknown reason"

      logger.error({ statusCode, message }, "Connection closed")

      this.socket = null
      this.clearGroupCache()

      switch (statusCode) {
        // ── Non-recoverable — require manual re-auth ────────────────────
        case DisconnectReason.loggedOut:
          logger.fatal("Logged out — manual re-authentication required")
          this.state = {
            status: "disconnected",
            error: "Logged out — scan QR code to reconnect",
          }
          this.running = false
          void this.notifyStatusChange("disconnected")
          break

        case DisconnectReason.badSession:
          logger.error("Bad session — clearing auth data required")
          this.state = {
            status: "disconnected",
            error: "Bad session — clearing auth data required",
          }
          this.running = false
          void this.notifyStatusChange("disconnected")
          break

        case DisconnectReason.connectionReplaced:
          logger.warn("Another instance connected — shutting down")
          this.state = {
            status: "disconnected",
            error: "Connection replaced by another instance",
          }
          this.running = false
          void this.notifyStatusChange("disconnected")
          break

        case DisconnectReason.multideviceMismatch:
          logger.error("Multi-device protocol mismatch — update Baileys")
          this.state = {
            status: "disconnected",
            error: "Multi-device version mismatch",
          }
          this.running = false
          break

        // ── Recoverable with delay ─────────────────────────────────────
        case DisconnectReason.forbidden:
          logger.error("Rate limited / IP blocked — waiting 60s")
          this.state = {
            status: "disconnected",
            error: "Rate limited — retrying in 60s",
          }
          setTimeout(() => {
            if (this.running) void this.establish()
          }, 60_000)
          break

        case DisconnectReason.timedOut:
          logger.warn("Connection timed out — retrying...")
          this.state = {
            status: "disconnected",
            error: "Connection timed out — retrying",
          }
          if (this.running) void this.scheduleReconnect()
          break

        // ── Retryable — reconnect with exponential backoff ─────────────
        default:
          this.state = {
            status: "disconnected",
            error: `Disconnected (${message}) — reconnecting...`,
          }
          if (this.running) void this.scheduleReconnect()
      }
    }
  }

  // ── Message Handler ──────────────────────────────────────────────────────

  private handleMessagesUpsert(messages: WAMessage[], type: string): void {
    if (type !== "notify") return

    for (const msg of messages) {
      if (msg.key.fromMe) continue

      // Delegate to the message handler pipeline
      void handleIncomingMessage(this.socket!, msg)
    }
  }

  // ── Group Participants Handler ──────────────────────────────────────────

  private async handleGroupParticipantsUpdate(event: {
    id: string
    participants: string[]
    action: string
    author: string
  }): Promise<void> {
    const { id, participants, action, author } = event

    logger.info({ id, action, participants, author }, "Group participants update")

    // Invalidate group cache for this JID
    this.groupCache.delete(id)

    switch (action) {
      case "add":
        await handleParticipantJoin(this.socket!, id, participants)
        break

      case "remove":
        await handleParticipantLeave(this.socket!, id, participants)
        break

      case "promote":
        logger.info({ id, participants }, "Participants promoted to admin")
        break

      case "demote":
        logger.info({ id, participants }, "Participants demoted from admin")
        break
    }
  }

  // ── Reconnection Logic ──────────────────────────────────────────────────

  private async scheduleReconnect(): Promise<void> {
    if (this.retryCount >= this.config.maxRetries) {
      logger.fatal("Max reconnection attempts reached — giving up")
      this.state = {
        status: "disconnected",
        error: "Max reconnection attempts reached",
      }
      this.running = false
      void this.notifyStatusChange("disconnected")
      return
    }

    const delay = this.config.reconnectBaseDelay * 2 ** this.retryCount
    const jitter = Math.random() * 1000
    const totalDelay = delay + jitter

    logger.info(
      { attempt: this.retryCount + 1, delay: Math.round(totalDelay) },
      "Scheduling reconnect",
    )

    await sleep(totalDelay)
    this.retryCount++

    if (this.running) {
      await this.establish()
    }
  }

  // ── Group Cache ─────────────────────────────────────────────────────────

  private startGroupCacheRefresh(): void {
    // Refresh group cache every 5 minutes
    this.groupCacheTimer = setInterval(() => {
      if (this.socket && this.state.status === "online") {
        void this.getGroups()
      }
    }, 5 * 60 * 1000)
  }

  private clearGroupCache(): void {
    this.groupCache.clear()
    if (this.groupCacheTimer) {
      clearInterval(this.groupCacheTimer)
      this.groupCacheTimer = null
    }
  }

  // ── Backend Notifications ───────────────────────────────────────────────

  private async notifyStatusChange(status: BotStatus): Promise<void> {
    if (!this.config.notifyBackend) return

    const botId = env.BACKEND_BOT_ID
    if (!botId) return

    try {
      const client = getApiClient()
      await client.updateBotStatus(botId, status)
      logger.debug({ status }, "Notified backend of status change")
    } catch (error) {
      logger.error({ error }, "Failed to notify backend of status change")
    }
  }

  private async notifyQRGenerated(qr: string): Promise<void> {
    if (!this.config.notifyBackend) return

    const botId = env.BACKEND_BOT_ID
    if (!botId) return

    try {
      const client = getApiClient()
      await client.sendQRCode(botId, qr)
      logger.debug("Sent QR code to backend")
    } catch (error) {
      logger.error({ error }, "Failed to send QR code to backend")
    }
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
