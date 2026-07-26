// ── Subscription Service ─────────────────────────────────────────────────────
// Business logic for subscription lifecycle: plan listing, creation, activation,
// expiration, cancellation, and automated expiry checks.

import prisma from "../config/database.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import type { SubscriptionStatus } from "../types/index.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlanResponse {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  maxDevices: number;
}

export interface SubscriptionResponse {
  id: string;
  status: SubscriptionStatus;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  plan: PlanResponse;
  createdAt: string;
}

// ── Plan Queries ─────────────────────────────────────────────────────────────

/**
 * Get all active subscription plans, ordered by duration.
 */
export async function getActivePlans(): Promise<PlanResponse[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { durationDays: "asc" },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    durationDays: p.durationDays,
    maxDevices: p.maxDevices,
  }));
}

/**
 * Get a single plan by ID.
 */
export async function getPlanById(id: string): Promise<PlanResponse> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan || !plan.active) {
    throw new NotFoundError("Subscription plan not found");
  }

  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    maxDevices: plan.maxDevices,
  };
}

// ── User Subscription ────────────────────────────────────────────────────────

/**
 * Get the current (active or pending) subscription for a user, with plan details
 * and remaining days.
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionResponse | null> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "ACTIVE"] as SubscriptionStatus[] },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!subscription) return null;

  const now = new Date();
  const daysRemaining = subscription.expiresAt
    ? Math.max(0, Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    id: subscription.id,
    status: subscription.status as SubscriptionStatus,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    expiresAt: subscription.expiresAt?.toISOString() ?? null,
    daysRemaining,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      price: subscription.plan.price,
      durationDays: subscription.plan.durationDays,
      maxDevices: subscription.plan.maxDevices,
    },
    createdAt: subscription.createdAt.toISOString(),
  };
}

// ── Subscription Lifecycle ───────────────────────────────────────────────────

/**
 * Create a pending subscription for a user. Throws if the user already has an
 * active or pending subscription.
 */
export async function createSubscription(
  userId: string,
  planId: string,
): Promise<{ subscriptionId: string }> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) {
    throw new NotFoundError("Subscription plan not found");
  }

  // If user already has an ACTIVE subscription, block
  const active = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" as SubscriptionStatus },
  });
  if (active) {
    throw new ValidationError("Kamu sudah punya langganan aktif. Cancel dulu sebelum ganti plan.");
  }

  // If user has a PENDING subscription, cancel it first (user is retrying)
  await prisma.subscription.deleteMany({
    where: { userId, status: "PENDING" as SubscriptionStatus },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId,
      status: "PENDING",
    },
  });

  return { subscriptionId: subscription.id };
}

/**
 * Activate a pending subscription: mark as ACTIVE and set startedAt/expiresAt.
 */
export async function activateSubscription(subscriptionId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }
  if (subscription.status !== "PENDING") {
    throw new ValidationError("Subscription is not in pending state");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + subscription.plan.durationDays * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      startedAt: now,
      expiresAt,
    },
  });
}

/**
 * Expire an active subscription: mark as EXPIRED and suspend the user's bot.
 */
export async function expireSubscription(subscriptionId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }
  if (subscription.status !== "ACTIVE") {
    return; // Already expired or not active — no-op
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "EXPIRED" },
    }),
    // Suspend the user's bot if one exists
    prisma.bot.updateMany({
      where: { userId: subscription.userId, status: { not: "SUSPENDED" } },
      data: { status: "SUSPENDED" },
    }),
  ]);
}

/**
 * Cancel a pending subscription (user request).
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "ACTIVE"] as SubscriptionStatus[] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new NotFoundError("Tidak ada langganan aktif yang bisa dibatalkan");
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "SUSPENDED" },
  });

  // Also suspend the bot if exists
  const bot = await prisma.bot.findUnique({ where: { userId } });
  if (bot && bot.status !== "SUSPENDED") {
    await prisma.bot.update({
      where: { id: bot.id },
      data: { status: "SUSPENDED" },
    });
  }
}

// ── Scheduled Tasks ──────────────────────────────────────────────────────────

/**
 * Check all active subscriptions and expire those past their expiry date.
 * Returns the count of expired subscriptions.
 */
export async function checkAndExpireSubscriptions(): Promise<number> {
  const now = new Date();

  const expired = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    include: { plan: true },
  });

  for (const sub of expired) {
    await expireSubscription(sub.id);
  }

  return expired.length;
}
