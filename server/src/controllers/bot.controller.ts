import { Request, Response, NextFunction } from "express";
import * as botService from "../services/bot.service.js";
import { success, error } from "../utils/response.js";

export async function getBotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const bot = await botService.getBot(userId);
    success(res, { bot: bot ?? null });
  } catch (err) { next(err); }
}

export async function createBotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const bot = await botService.createBot(userId);
    success(res, { bot, message: "Bot created" }, 201);
  } catch (err) { next(err); }
}

export async function getQRHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);
    if (!bot) { error(res, "NOT_FOUND", "No bot", 404); return; }
    const qr = await botService.getQRCode(bot.id);
    success(res, { qr: qr.qrCode });
  } catch (err) { next(err); }
}

export async function webhookStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { botId, status } = req.body as { botId: string; status: string };
    await botService.updateBotStatus(botId, status);
    success(res, { received: true });
  } catch (err) { next(err); }
}

export async function webhookQRHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { botId, qr } = req.body as { botId: string; qr: string };
    await botService.storeQRCode(botId, qr);
    success(res, { received: true });
  } catch (err) { next(err); }
}

// ── GET /api/bot/status — polling status from bot service ────────────────

export async function botStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    try {
      const r = await fetch(`http://localhost:3001/status/${userId}`);
      const data = await r.json();
      success(res, data);
    } catch {
      success(res, { userId, status: "offline" });
    }
  } catch (err) { next(err); }
}

async function getBotId(userId: string): Promise<string | null> {
  const bot = await botService.findBotByUserId(userId);
  return bot?.id ?? null;
}

export async function connectBotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const botId = await getBotId(userId);
    if (botId) await botService.updateBotStatus(botId, "CONNECTING");
    try { await fetch(`http://localhost:3001/connect/${userId}`, { method: "POST" }); } catch {}
    success(res, { message: "Connecting. Scan QR code to link device.", botId: userId });
  } catch (err) { next(err); }
}

export async function pairingBotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const { phone } = req.body as { phone: string };
    if (!phone || phone.length < 10) {
      error(res, "VALIDATION_ERROR", "Nomor tidak valid. Format: 62812xxx", 422);
      return;
    }
    const botId = await getBotId(userId);
    if (botId) await botService.updateBotStatus(botId, "CONNECTING");
    let pairingCode: string | null = null;
    try {
      const r = await fetch(`http://localhost:3001/pairing/${userId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      pairingCode = ((await r.json()) as { pairingCode?: string }).pairingCode ?? null;
    } catch {}
    success(res, { message: pairingCode ? "Kode pairing berhasil" : "Meminta kode pairing...", pairingCode, botId: userId });
  } catch (err) { next(err); }
}

export async function disconnectBotHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const botId = await getBotId(userId);
    try { await fetch(`http://localhost:3001/disconnect/${userId}`, { method: "POST" }); } catch {}
    if (botId) await botService.updateBotStatus(botId, "OFFLINE");
    success(res, { message: "Bot disconnected" });
  } catch (err) { next(err); }
}

export async function deleteSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId as string;
    const botId = await getBotId(userId);
    try { await fetch(`http://localhost:3001/session/${userId}`, { method: "DELETE" }); } catch {}
    if (botId) await botService.updateBotStatus(botId, "OFFLINE");
    success(res, { message: "Session cleared." });
  } catch (err) { next(err); }
}
