// ── Group Routes ───────────────────────────────────────────────────────────
// All group-related endpoints mounted under /api/groups.
// Most routes require authentication + active subscription.
// Bot service routes use API key auth.

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";
import { requireBotApiKey } from "../middleware/bot-api-key.js";
import * as groupController from "../controllers/group.controller.js";

const router = Router();

// ── User-facing routes (auth + subscription required) ──────────────────────

// List groups
router.get("/", authenticate, requireActiveSubscription, groupController.listGroupsHandler);

// Single group
router.get("/:id", authenticate, requireActiveSubscription, groupController.getGroupHandler);

// Group settings
router.put("/:id/settings", authenticate, requireActiveSubscription, groupController.updateSettingsHandler);

// Group owners
router.get("/:id/owners", authenticate, requireActiveSubscription, groupController.listOwnersHandler);
router.post("/:id/owners", authenticate, requireActiveSubscription, groupController.addOwnerHandler);
router.delete("/:id/owners/:jid", authenticate, requireActiveSubscription, groupController.removeOwnerHandler);

// Group admins
router.get("/:id/admins", authenticate, requireActiveSubscription, groupController.listAdminsHandler);
router.post("/:id/admins", authenticate, requireActiveSubscription, groupController.addAdminHandler);
router.delete("/:id/admins/:jid", authenticate, requireActiveSubscription, groupController.removeAdminHandler);

// ── Bot service routes (API key auth) ─────────────────────────────────────
router.get("/:jid/settings", requireBotApiKey, groupController.getGroupSettingsByJidHandler);

export default router;
