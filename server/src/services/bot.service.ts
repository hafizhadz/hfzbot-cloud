// ── Bot Service ────────────────────────────────────────────────────────────
// Business logic for bot lifecycle — creation, status management, session
// handling, and QR code pairing.

import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";
import type { BotStatus } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BotResult {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  sessionData: string | null;
  lastConnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  groupsCount: number;
}

export interface QRCodeResult {
  qrCode: string | null;
  expiresAt: Date | null;
}

// ── Create Bot ─────────────────────────────────────────────────────────────

/**
 * Create a new bot for the given user.
 * Business rules:
 * - Max 1 bot per user
 * - Requires active subscription
 */
export async function createBot(userId: string): Promise<BotResult> {
  // Check if user already has a bot
  const existing = await prisma.bot.findUnique({ where: { userId } });
  if (existing) {
    throw new ValidationError("User already has a bot");
  }

  // Verify active subscription
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new ForbiddenError("Active subscription required to create a bot");
  }

  if (subscription.expiresAt && subscription.expiresAt <= new Date()) {
    throw new ForbiddenError("Subscription has expired");
  }

  // Get user name for default bot name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const bot = await prisma.bot.create({
    data: {
      userId,
      name: `${user.name}'s Bot`,
      status: "OFFLINE",
    },
  });

  return { ...bot, groupsCount: 0 };
}

// ── Get Bot ────────────────────────────────────────────────────────────────

/**
 * Get a user's bot with connected groups count.
 */
export async function getBot(userId: string): Promise<BotResult | null> {
  const bot = await prisma.bot.findUnique({
    where: { userId },
    include: {
      _count: { select: { groups: true } },
    },
  });

  if (!bot) return null;

  return {
    id: bot.id,
    userId: bot.userId,
    name: bot.name,
    phoneNumber: bot.phoneNumber,
    status: bot.status,
    sessionData: bot.sessionData,
    lastConnectedAt: bot.lastConnectedAt,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
    groupsCount: bot._count.groups,
  };
}

// ── Update Bot Status ──────────────────────────────────────────────────────

/**
 * Update bot status and optional connection info.
 */
export async function updateBotStatus(
  botId: string,
  status: string,
  data?: { phoneNumber?: string; lastConnectedAt?: Date },
): Promise<void> {
  const validStatuses = ["OFFLINE", "CONNECTING", "ONLINE", "DISCONNECTED", "SUSPENDED"];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status: ${status}`);
  }

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: {
      status: status as BotStatus,
      phoneNumber: data?.phoneNumber ?? undefined,
      lastConnectedAt: data?.lastConnectedAt ?? undefined,
    },
  });
}

// ── Get QR Code ────────────────────────────────────────────────────────────

/**
 * Get current QR code or signal a new pairing request.
 * The bot service generates QR codes; the API returns the latest one.
 */
export async function getQRCode(botId: string): Promise<QRCodeResult> {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  // QR data is stored in sessionData field temporarily during pairing
  // The bot service pushes QR codes via webhook
  // Return what we have; null means no QR available (trigger new pairing)
  return {
    qrCode: bot.sessionData ?? null,
    expiresAt: null,
  };
}

// ── Store QR Code (webhook) ────────────────────────────────────────────────

/**
 * Store QR code data pushed from the bot service via webhook.
 */
export async function storeQRCode(
  botId: string,
  qrCode: string,
): Promise<void> {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: {
      sessionData: qrCode,
      status: "CONNECTING",
    },
  });
}

// ── Suspend Bot ────────────────────────────────────────────────────────────

/**
 * Suspend a bot — sets status to SUSPENDED.
 */
export async function suspendBot(botId: string): Promise<void> {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { status: "SUSPENDED" },
  });
}

// ── Activate Bot ───────────────────────────────────────────────────────────

/**
 * Activate a suspended bot if subscription is active.
 */
export async function activateBot(botId: string): Promise<void> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { user: true },
  });

  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  // Verify user has active subscription
  const subscription = await prisma.subscription.findFirst({
    where: { userId: bot.userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new ForbiddenError("Active subscription required to activate bot");
  }

  if (subscription.expiresAt && subscription.expiresAt <= new Date()) {
    throw new ForbiddenError("Subscription has expired");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { status: "OFFLINE" },
  });
}

// ── Delete Session ─────────────────────────────────────────────────────────

/**
 * Clear session data — forces the bot to re-scan QR code.
 */
export async function deleteSession(botId: string): Promise<void> {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: {
      sessionData: null,
      status: "OFFLINE",
      lastConnectedAt: null,
    },
  });
}

// ── Find Bot By Id ─────────────────────────────────────────────────────────

/**
 * Find a bot by its ID (used internally and by webhook handlers).
 */
export async function findBotById(botId: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    throw new NotFoundError("Bot not found");
  }
  return bot;
}

/**
 * Find a bot by user ID — returns raw Prisma model.
 */
export async function findBotByUserId(userId: string) {
  return prisma.bot.findUnique({ where: { userId } });
}
