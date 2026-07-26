// ── Group Controller ───────────────────────────────────────────────────────
// Route handlers for group management. Most routes are authenticated and
// require subscription. Bot service webhook routes use API key auth.

import { Request, Response, NextFunction } from "express";
import * as groupService from "../services/group.service.js";
import * as botService from "../services/bot.service.js";
import { success, error } from "../utils/response.js";

// ── GET /api/groups — List all groups for user's bot ──────────────────────

export async function listGroupsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const bot = await botService.findBotByUserId(userId);

    if (!bot) {
      success(res, { groups: [] });
      return;
    }

    const groups = await groupService.getGroups(bot.id);
    success(res, { groups });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/groups/:id — Single group with settings ──────────────────────

export async function getGroupHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const group = await groupService.getGroup(id);
    success(res, { group });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/groups/:id/settings — Update group settings ─────────────────

export async function updateSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { featureToggles } = req.body as { featureToggles: Record<string, boolean> };

    if (!featureToggles) {
      error(res, "VALIDATION_ERROR", "featureToggles object is required", 422);
      return;
    }

    const settings = await groupService.updateGroupSettings(id, featureToggles);
    success(res, { settings });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/groups/:id/owners — List owners ─────────────────────────────

export async function listOwnersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const owners = await groupService.getOwners(id);
    success(res, { owners });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/groups/:id/owners — Add owner ──────────────────────────────

export async function addOwnerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { userJid, role } = req.body as { userJid: string; role?: string };

    if (!userJid) {
      error(res, "VALIDATION_ERROR", "userJid is required", 422);
      return;
    }

    const owner = await groupService.addOwner(id, userJid, role ?? "CO_OWNER", null);
    success(res, { owner }, 201);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/groups/:id/owners/:jid — Remove owner ────────────────────

export async function removeOwnerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const jid = req.params.jid as string;
    await groupService.removeOwner(id, jid);
    success(res, { message: "Owner removed successfully" });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/groups/:id/admins — List admins ─────────────────────────────

export async function listAdminsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const admins = await groupService.getAdmins(id);
    success(res, { admins });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/groups/:id/admins — Add admin ──────────────────────────────

export async function addAdminHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { userJid } = req.body as { userJid: string };

    if (!userJid) {
      error(res, "VALIDATION_ERROR", "userJid is required", 422);
      return;
    }

    const admin = await groupService.addAdmin(id, userJid, null);
    success(res, { admin }, 201);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/groups/:id/admins/:jid — Remove admin ────────────────────

export async function removeAdminHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const jid = req.params.jid as string;
    await groupService.removeAdmin(id, jid);
    success(res, { message: "Admin removed successfully" });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/groups/:jid/settings — PUBLIC (API key) — Bot service fetches

export async function getGroupSettingsByJidHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jid = req.params.jid as string;
    const group = await groupService.getGroupByJid(jid);
    const settings = await groupService.updateGroupSettings(
      group.id,
      group.settings?.featureToggles ?? {},
    );
    success(res, { group: { ...group, settings } });
  } catch (err) {
    next(err);
  }
}
