import dotenv from "dotenv"

// Load .env file from project root
dotenv.config()

export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

function numericEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === "") return fallback
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? fallback : parsed
}

/**
 * Typed, validated environment configuration.
 * All env access goes through this module — never read process.env directly.
 */
export const env = {
  BOT_NAME: optionalEnv("BOT_NAME", "HfzBot"),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),
  HEALTH_PORT: numericEnv("HEALTH_PORT", 3001),
  AUTH_DIR: optionalEnv("AUTH_DIR", "auth_state"), // relative to project root (resolved by session.ts)

  // ── Connection ────────────────────────────────────────────────────────────
  RECONNECT_BASE_DELAY: numericEnv("RECONNECT_BASE_DELAY", 1000),
  MAX_RETRIES: numericEnv("MAX_RETRIES", 10),
  CONNECT_TIMEOUT_MS: numericEnv("CONNECT_TIMEOUT_MS", 20000),
  KEEP_ALIVE_INTERVAL_MS: numericEnv("KEEP_ALIVE_INTERVAL_MS", 30000),
  QR_TIMEOUT_MS: numericEnv("QR_TIMEOUT_MS", 60000),

  // ── Backend API ───────────────────────────────────────────────────────────
  BOT_API_KEY: optionalEnv("BOT_API_KEY", ""),
  BACKEND_API_URL: optionalEnv("BACKEND_API_URL", "http://localhost:8000/api"),
  BACKEND_BOT_ID: optionalEnv("BACKEND_BOT_ID", ""),

  // ── Proxy (opsional) ──────────────────────────────────────────────────────
  PROXY_URL: optionalEnv("PROXY_URL", ""), // contoh: http://user:pass@ip:port atau socks5://ip:port
  PROXY_ENABLED: optionalEnv("PROXY_ENABLED", "false"),

  NODE_ENV: optionalEnv("NODE_ENV", "development"),
} as const
