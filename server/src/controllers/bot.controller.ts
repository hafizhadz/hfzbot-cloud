// ── Bot Controller ─────────────────────────────────────────────────────────
// Route handlers for bot management. User-facing routes require auth +
// active subscription. Webhook routes use API key auth.

import { Request, Response, NextFunction } from "express";
import * as botService from "../services/bot.service.js";
import { success, error } from "../utils/response.js";

// ── GET /api/bot — Get user's bot ──────────────────────────────────────────

export async function getBotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.getBot(userId);

    if (!bot) {
      success(res, { bot: null, message: "No bot configured. Create one to get started." });
      return;
    }

    success(res, { bot });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot — Create bot ─────────────────────────────────────────────

export async function createBotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.createBot(userId);
    success(res, { bot, message: "Bot created successfully" }, 201);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot/connect — Request bot connection ────────────────────────

export async function connectBotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);

    if (!bot) {
      error(res, "NOT_FOUND", "No bot found. Create a bot first.", 404);
      return;
    }

    // Update status to CONNECTING
    await botService.updateBotStatus(bot.id, "CONNECTING");

    // Call bot service to initiate WhatsApp connection
    try {
      await fetch("http://localhost:3001/connect", { method: "POST" });
    } catch {
      // Bot service might not be running — that's ok, status is set
    }

    success(res, { message: "Connection initiated. Scan QR code to connect.", botId: bot.id });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot/pairing — Connect with pairing code ─────────────────────

export async function pairingBotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const { phone } = req.body as { phone: string };
    const bot = await botService.findBotByUserId(userId);

    if (!bot) {
      error(res, "NOT_FOUND", "No bot found. Create a bot first.", 404);
      return;
    }

    if (!phone || phone.length < 10) {
      error(res, "VALIDATION_ERROR", "Nomor telepon tidak valid. Gunakan format: 62812xxxx", 422);
      return;
    }

    // Update status to CONNECTING
    await botService.updateBotStatus(bot.id, "CONNECTING");

    // Call bot service with phone for pairing
    try {
      await fetch("http://localhost:3001/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch {
      // Bot service might not be running
    }

    success(res, { message: "Pairing code diminta. Cek dashboard untuk kode pairing.", botId: bot.id });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot/disconnect — Disconnect bot ─────────────────────────────

export async function disconnectBotHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);

    if (bot) {
      await botService.updateBotStatus(bot.id, "OFFLINE");

      // Call bot service to disconnect
      try {
        await fetch("http://localhost:3001/disconnect", { method: "POST" });
      } catch {
        // Bot service might not be running
      }
    }

    success(res, { message: "Bot disconnected" });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bot/qr — Get QR code for pairing ─────────────────────────────

export async function getQRHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);

    if (!bot) {
      error(res, "NOT_FOUND", "No bot found. Create a bot first.", 404);
      return;
    }

    const qr = await botService.getQRCode(bot.id);
    success(res, { qr: qr.qrCode });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/bot/session — Clear session (force re-scan) ──────────────

export async function deleteSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);

    if (!bot) {
      error(res, "NOT_FOUND", "No bot found.", 404);
      return;
    }

    await botService.deleteSession(bot.id);
    success(res, { message: "Session cleared. Scan QR code to reconnect." });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot/webhook/status — Bot service updates status ────────────

export async function webhookStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { botId, status, phoneNumber } = req.body as {
      botId: string;
      status: string;
      phoneNumber?: string;
    };

    if (!botId || !status) {
      error(res, "VALIDATION_ERROR", "botId and status are required", 422);
      return;
    }

    await botService.updateBotStatus(botId, status, {
      phoneNumber,
      lastConnectedAt: status === "ONLINE" ? new Date() : undefined,
    });

    success(res, { message: "Status updated" });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bot/webhook/qr — Bot service sends QR code ────────────────

export async function webhookQRHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { botId, qrCode } = req.body as {
      botId: string;
      qrCode: string;
    };

    if (!botId || !qrCode) {
      error(res, "VALIDATION_ERROR", "botId and qrCode are required", 422);
      return;
    }

    await botService.storeQRCode(botId, qrCode);
    success(res, { message: "QR code stored" });
  } catch (err) {
    next(err);
  }
}
