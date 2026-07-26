import pino from "pino"

import { env } from "./env"

/**
 * Shared pino logger instance.
 * Baileys uses pino internally, so using pino here keeps logging consistent.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  redact: {
    paths: ["creds", "auth", "password", "token", "secret"],
    censor: "[REDACTED]",
  },
})
