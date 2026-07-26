// ── Payment Routes ──────────────────────────────────────────────────────────
// Payment endpoints mounted under /api/payments.
// Webhook route is public (signature-based auth); all others require JWT.

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as paymentController from "../controllers/payment.controller.js";

const router = Router();

// ── Webhook (public — verified by signature) ────────────────────────────────
router.post("/webhook", paymentController.handleWebhook);

// ── Protected Payment Routes ────────────────────────────────────────────────
router.post("/create-charge", authenticate, paymentController.createCharge);
router.get("/status/:txId", authenticate, paymentController.checkStatus);
router.get("/history", authenticate, paymentController.getHistory);

export default router;
