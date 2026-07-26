// ── JWT Sign & Verify Utilities ────────────────────────────────────────────
// Wraps jsonwebtoken with typed payloads and consistent error handling.

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { JwtPayload, TokenPair } from "../types/index.js";

// Parse duration strings like "15m" or "7d" to seconds for jsonwebtoken
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900; // default 15min
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}

/**
 * Sign an access token (short-lived: 15min by default).
 */
export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.jwt.secret, {
    expiresIn: parseDuration(env.jwt.accessExpiry),
  });
}

/**
 * Sign a refresh token (long-lived: 7 days by default).
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.jwt.refreshSecret, {
    expiresIn: parseDuration(env.jwt.refreshExpiry),
  });
}

/**
 * Sign both access + refresh tokens.
 */
export function signTokenPair(userId: string): TokenPair {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

/**
 * Verify and decode a JWT. Throws on invalid/expired token.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw err;
  }
}

/**
 * Verify a refresh token (uses the refresh secret).
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(
      token,
      env.jwt.refreshSecret,
    ) as JwtPayload;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw err;
  }
}
