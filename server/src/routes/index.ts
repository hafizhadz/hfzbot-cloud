// ── Route Aggregator ───────────────────────────────────────────────────────
// All route modules are imported and mounted here under the /api prefix.

import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import paymentRoutes from "./payment.routes.js";
import botRoutes from "./bot.routes.js";
import groupRoutes from "./group.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/payments", paymentRoutes);
router.use("/bot", botRoutes);
router.use("/groups", groupRoutes);

export default router;
