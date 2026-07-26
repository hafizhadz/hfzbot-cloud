// ── Rate Limiting Middleware ───────────────────────────────────────────────
// Uses express-rate-limit. Apply the general limiter globally and the
// auth-specific limiter to authentication routes.

import { rateLimit } from "express-rate-limit";

/**
 * General API rate limiter: 200 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" },
  },
});

/**
 * Strict rate limiter for authentication endpoints: 30 requests per minute.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Too many auth attempts, please try again later" },
  },
});
