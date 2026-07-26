import { env } from "../utils/env.js"
import { logger } from "../utils/logger.js"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BotConfig {
  botId: string
  name: string
  status: string
  autoStart: boolean
}

export interface GroupSettings {
  groupJid: string
  welcomeEnabled: boolean
  goodbyeEnabled: boolean
  antiLink: boolean
  antiSpam: boolean
  antiFlood: boolean
  levelingEnabled: boolean
  economyEnabled: boolean
  gamesEnabled: boolean
}

export interface ActivityEvent {
  type: string
  groupJid?: string
  sender?: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface AnalyticsEvent {
  event: string
  groupJid?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

interface FetchOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  path: string
  body?: unknown
}

/**
 * BackendApiClient communicates with the Laravel/Express backend.
 *
 * All requests include the API key for authentication.
 * Errors are logged and surfaced rather than swallowed.
 */
export class BackendApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    // Normalise: strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.apiKey = apiKey

    if (!this.apiKey) {
      logger.warn("BackendApiClient initialised with empty API key — requests will fail")
    }
  }

  // ── Bot status ───────────────────────────────────────────────────────────

  async updateBotStatus(botId: string, status: string): Promise<void> {
    await this.fetch({
      method: "PATCH",
      path: `/bots/${botId}/status`,
      body: { status },
    })
  }

  async sendQRCode(botId: string, qrCode: string): Promise<void> {
    await this.fetch({
      method: "POST",
      path: `/bots/${botId}/qr`,
      body: { qrCode },
    })
  }

  async getBotConfig(botId: string): Promise<BotConfig> {
    const data = await this.fetch<BotConfig>({
      method: "GET",
      path: `/bots/${botId}/config`,
    })
    return data
  }

  // ── Group settings ───────────────────────────────────────────────────────

  async getGroupSettings(groupJid: string): Promise<GroupSettings> {
    const encoded = encodeURIComponent(groupJid)
    const data = await this.fetch<GroupSettings>({
      method: "GET",
      path: `/groups/${encoded}/settings`,
    })
    return data
  }

  // ── Events ───────────────────────────────────────────────────────────────

  async sendActivityEvent(botId: string, event: ActivityEvent): Promise<void> {
    await this.fetch({
      method: "POST",
      path: `/bots/${botId}/activity`,
      body: event,
    })
  }

  async sendAnalyticsEvent(botId: string, event: AnalyticsEvent): Promise<void> {
    await this.fetch({
      method: "POST",
      path: `/bots/${botId}/analytics`,
      body: event,
    })
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async fetch<T = void>(options: FetchOptions): Promise<T> {
    const { method, path, body } = options
    const url = `${this.baseUrl}${path}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      Accept: "application/json",
    }

    logger.debug({ method, url }, "Backend API request")

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error")
        logger.error(
          { status: response.status, body: text, url, method },
          "Backend API request failed",
        )
        return undefined as T
      }

      // For 204 No Content, return undefined
      if (response.status === 204) {
        return undefined as T
      }

      const data = (await response.json()) as T
      return data
    } catch (error) {
      logger.error({ error, url, method }, "Backend API network error")
      return undefined as T
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

let _instance: BackendApiClient | null = null

/**
 * Returns the shared BackendApiClient instance.
 * Lazily initialises from env vars on first access.
 */
export function getApiClient(): BackendApiClient {
  if (!_instance) {
    _instance = new BackendApiClient(env.BACKEND_API_URL, env.BOT_API_KEY)
  }
  return _instance
}
