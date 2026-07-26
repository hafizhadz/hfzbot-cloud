// ── Subscription Integration Tests ───────────────────────────────────────────
// Tests subscription plan listing, creation, activation, expiration, and
// cancellation flows using the actual SQLite database.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";
import * as subscriptionService from "../src/services/subscription.service.js";
import { ValidationError, NotFoundError } from "../src/utils/errors.js";

// ── Test Data ───────────────────────────────────────────────────────────────

let testUserId: string;
let testPlanId: string;
const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();

  // Create a test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.create({
    data: {
      name: "Subscription Test User",
      email: `sub-test-${uniqueSuffix}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  testUserId = user.id;

  // Ensure test plan exists
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: "7-days" },
    update: { price: 10000, durationDays: 7, active: true },
    create: {
      id: "7-days",
      name: "7 Days",
      price: 10000,
      durationDays: 7,
      active: true,
    },
  });
  testPlanId = plan.id;

  // Also ensure the other plans exist
  await prisma.subscriptionPlan.upsert({
    where: { id: "30-days" },
    update: { price: 30000, durationDays: 30, active: true },
    create: {
      id: "30-days",
      name: "30 Days",
      price: 30000,
      durationDays: 30,
      active: true,
    },
  });
  await prisma.subscriptionPlan.upsert({
    where: { id: "90-days" },
    update: { price: 75000, durationDays: 90, active: true },
    create: {
      id: "90-days",
      name: "90 Days",
      price: 75000,
      durationDays: 90,
      active: true,
    },
  });
  await prisma.subscriptionPlan.upsert({
    where: { id: "365-days" },
    update: { price: 250000, durationDays: 365, active: true },
    create: {
      id: "365-days",
      name: "365 Days",
      price: 250000,
      durationDays: 365,
      active: true,
    },
  });
});

afterAll(async () => {
  // Clean up test data
  await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  await prisma.payment.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.$disconnect();
});

// Clean up subscriptions between tests
beforeEach(async () => {
  await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  await prisma.payment.deleteMany({ where: { userId: testUserId } });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/subscription/plans", () => {
  it("should return all active plans ordered by duration", async () => {
    const plans = await subscriptionService.getActivePlans();

    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThanOrEqual(4);

    // Verify order by durationDays ascending
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].durationDays).toBeGreaterThanOrEqual(plans[i - 1].durationDays);
    }

    // Verify plan structure
    const sevenDay = plans.find((p) => p.durationDays === 7);
    expect(sevenDay).toBeDefined();
    expect(sevenDay!.name).toBe("7 Days");
    expect(sevenDay!.price).toBe(10000);
  });
});

describe("POST /api/subscription/create", () => {
  it("should create a pending subscription and return subscriptionId", async () => {
    const result = await subscriptionService.createSubscription(testUserId, testPlanId);

    expect(result).toBeDefined();
    expect(result.subscriptionId).toBeDefined();
    expect(typeof result.subscriptionId).toBe("string");

    // Verify subscription was created in DB
    const sub = await prisma.subscription.findUnique({
      where: { id: result.subscriptionId },
    });
    expect(sub).toBeDefined();
    expect(sub!.status).toBe("PENDING");
    expect(sub!.userId).toBe(testUserId);
    expect(sub!.planId).toBe(testPlanId);
  });

  it("should throw error when user already has an active subscription", async () => {
    // Create first subscription
    await subscriptionService.createSubscription(testUserId, testPlanId);
    await subscriptionService.activateSubscription(
      (await prisma.subscription.findFirst({ where: { userId: testUserId } }))!.id,
    );

    // Try to create another — should fail
    await expect(
      subscriptionService.createSubscription(testUserId, testPlanId),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw error when plan does not exist", async () => {
    await expect(
      subscriptionService.createSubscription(testUserId, "non-existent-plan"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("POST /api/subscription/cancel", () => {
  it("should cancel a pending subscription", async () => {
    // Create a pending subscription
    const { subscriptionId } = await subscriptionService.createSubscription(
      testUserId,
      testPlanId,
    );

    // Cancel it
    await subscriptionService.cancelSubscription(testUserId);

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    expect(sub!.status).toBe("SUSPENDED");
  });

  it("should throw error when no pending subscription to cancel", async () => {
    await expect(
      subscriptionService.cancelSubscription(testUserId),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("GET /api/subscription/current", () => {
  it("should return null when user has no subscription", async () => {
    const result = await subscriptionService.getUserSubscription(testUserId);
    expect(result).toBeNull();
  });

  it("should return subscription with plan details and days remaining", async () => {
    // Create and activate subscription
    const { subscriptionId } = await subscriptionService.createSubscription(
      testUserId,
      testPlanId,
    );
    await subscriptionService.activateSubscription(subscriptionId);

    const result = await subscriptionService.getUserSubscription(testUserId);

    expect(result).not.toBeNull();
    expect(result!.status).toBe("ACTIVE");
    expect(result!.plan.name).toBe("7 Days");
    expect(result!.plan.durationDays).toBe(7);
    expect(result!.startedAt).not.toBeNull();
    expect(result!.expiresAt).not.toBeNull();
    expect(result!.daysRemaining).toBeGreaterThan(0);
  });
});

describe("Subscription Expiration", () => {
  it("should expire an active subscription and update status", async () => {
    // Create and activate
    const { subscriptionId } = await subscriptionService.createSubscription(
      testUserId,
      testPlanId,
    );
    await subscriptionService.activateSubscription(subscriptionId);

    // Force expire by setting expiresAt to the past
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Run expiry check
    const count = await subscriptionService.checkAndExpireSubscriptions();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify status
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    expect(sub!.status).toBe("EXPIRED");
  });

  it("should not expire an active subscription that is not yet due", async () => {
    // Create and activate
    const { subscriptionId } = await subscriptionService.createSubscription(
      testUserId,
      testPlanId,
    );
    await subscriptionService.activateSubscription(subscriptionId);

    // Run expiry check — should not expire recent subscription
    const count = await subscriptionService.checkAndExpireSubscriptions();
    expect(count).toBe(0);

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    expect(sub!.status).toBe("ACTIVE");
  });
});
