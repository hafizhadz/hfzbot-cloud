// ── Subscription Routes ─────────────────────────────────────────────────────
// All subscription-related endpoints mounted under /api/subscription.
// All routes require authentication.

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as subscriptionController from "../controllers/subscription.controller.js";

const router = Router();

// All subscription routes require authentication
router.use(authenticate);

// ── Plans ───────────────────────────────────────────────────────────────────
router.get("/plans", subscriptionController.listPlans);

// ── Current Subscription ────────────────────────────────────────────────────
router.get("/current", subscriptionController.getCurrentSubscription);

// ── Create / Cancel ─────────────────────────────────────────────────────────
router.post("/create", subscriptionController.createSubscription);
router.post("/cancel", subscriptionController.cancelSubscription);

export default router;
