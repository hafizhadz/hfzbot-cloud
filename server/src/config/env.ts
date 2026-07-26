// ── Central Environment Configuration ──────────────────────────────────────
// Loads and validates environment variables. Throws on startup if critical
// vars are missing in production.

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (two levels up from src/config/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function envString(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    console.warn(`⚠️  Warning: Environment variable ${key} is not set`);
    return "";
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return fallback;
  return parsed;
}

export const env = {
  // Server
  port: envInt("PORT", 8000),
  nodeEnv: envString("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),

  // JWT
  jwt: {
    secret: envString("JWT_SECRET", "dev-jwt-secret-change-in-production"),
    refreshSecret: envString(
      "JWT_REFRESH_SECRET",
      "dev-refresh-secret-change-in-production",
    ),
    accessExpiry: envString("JWT_ACCESS_EXPIRY", "15m"),
    refreshExpiry: envString("JWT_REFRESH_EXPIRY", "7d"),
  },

  // Google OAuth
  google: {
    clientId: envString("GOOGLE_CLIENT_ID"),
    clientSecret: envString("GOOGLE_CLIENT_SECRET"),
    callbackUrl: envString(
      "GOOGLE_CALLBACK_URL",
      "http://localhost:8000/api/auth/google/callback",
    ),
  },

  // Payment Gateway (QRIS)
  payment: {
    apiKey: envString("PAYMENT_API_KEY", "dev-payment-key"),
    webhookSecret: envString("PAYMENT_WEBHOOK_SECRET", "dev-webhook-secret"),
    mode: envString("PAYMENT_MODE", "sandbox"),
    baseUrl: envString("PAYMENT_BASE_URL", "https://qris.hanssoft.web.id/api"),
  },

  // Bot Service API
  botApiKey: envString(
    "BOT_API_KEY",
    "dev-bot-api-key-change-in-production",
  ),

  // Session
  sessionSecret: envString(
    "SESSION_SECRET",
    "dev-session-secret-change-in-production",
  ),
} as const;
