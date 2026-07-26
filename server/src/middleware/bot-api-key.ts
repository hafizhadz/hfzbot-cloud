// ── Bot Service API Key Middleware ──────────────────────────────────────────
// Validates the x-api-key header against BOT_API_KEY env var for webhook
// routes called by the external bot service.

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { error } from "../utils/response.js";

/**
 * Middleware that checks the x-api-key header matches the configured
 * BOT_API_KEY environment variable. Used for bot service webhook endpoints.
 */
export function requireBotApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    error(res, "UNAUTHORIZED", "API key required", 401);
    return;
  }

  if (apiKey !== env.botApiKey) {
    error(res, "FORBIDDEN", "Invalid API key", 403);
    return;
  }

  next();
}
