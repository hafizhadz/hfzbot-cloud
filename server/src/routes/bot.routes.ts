// ── Bot Routes ─────────────────────────────────────────────────────────────
// All bot-related endpoints mounted under /api/bot.
// User-facing routes require authentication + active subscription.
// Webhook routes use API key auth (x-api-key header).

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";
import { requireBotApiKey } from "../middleware/bot-api-key.js";
import * as botController from "../controllers/bot.controller.js";

const router = Router();

// ── User-facing routes (auth required) ─────────────────────────────────────
router.get("/", authenticate, botController.getBotHandler);
router.post("/", authenticate, botController.createBotHandler);
router.post("/connect", authenticate, botController.connectBotHandler);
router.post("/pairing", authenticate, botController.pairingBotHandler);
router.post("/disconnect", authenticate, botController.disconnectBotHandler);
router.get("/qr", authenticate, botController.getQRHandler);
router.delete("/session", authenticate, botController.deleteSessionHandler);

// ── Bot service webhook routes (API key auth) ─────────────────────────────
router.post("/webhook/status", requireBotApiKey, botController.webhookStatusHandler);
router.post("/webhook/qr", requireBotApiKey, botController.webhookQRHandler);

export default router;
