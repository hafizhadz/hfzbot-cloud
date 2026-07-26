// ── Health Controller ──────────────────────────────────────────────────────

import { Request, Response } from "express";
import { success } from "../utils/response.js";

/**
 * GET /api/health
 * Returns server status, uptime, and current timestamp.
 */
export function checkHealth(_req: Request, res: Response): void {
  success(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
}
