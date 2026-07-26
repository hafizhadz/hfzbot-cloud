// ── Bot Service Integration Tests ──────────────────────────────────────────
// Tests bot lifecycle: create, get, duplicate block, QR, session, subscription.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";
import * as botService from "../src/services/bot.service.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../src/utils/errors.js";

// ── Test Data ──────────────────────────────────────────────────────────────

let testUserId: string;
let secondUserId: string;
let testBotId: string;
let subscriptionPlanId: string;

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();

  // Create subscription plan
  const plan = await prisma.subscriptionPlan.create({
    data: {
      id: `test-plan-${Date.now()}`,
      name: "Test Plan",
      price: 10000,
      durationDays: 30,
      active: true,
    },
  });
  subscriptionPlanId = plan.id;

  // Create first test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.create({
    data: {
      name: "Bot Test User",
      email: `bot-test-${Date.now()}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  testUserId = user.id;

  // Create second test user (no subscription)
  const user2 = await prisma.user.create({
    data: {
      name: "Bot Test User 2",
      email: `bot-test-2-${Date.now()}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  secondUserId = user2.id;

  // Create subscription for first user
  await prisma.subscription.create({
    data: {
      userId: testUserId,
      planId: subscriptionPlanId,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create bot for first user
  const bot = await prisma.bot.create({
    data: {
      userId: testUserId,
      name: "Test User's Bot",
      status: "OFFLINE",
    },
  });
  testBotId = bot.id;
});

afterAll(async () => {
  // Clean up all test data
  if (testBotId) {
    await prisma.groupOwner.deleteMany({ where: { group: { botId: testBotId } } });
    await prisma.groupAdmin.deleteMany({ where: { group: { botId: testBotId } } });
    await prisma.groupSettings.deleteMany({ where: { group: { botId: testBotId } } });
    await prisma.group.deleteMany({ where: { botId: testBotId } });
  }
  await prisma.bot.deleteMany({ where: { userId: { in: [testUserId, secondUserId] } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: [testUserId, secondUserId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [testUserId, secondUserId] } } });
  await prisma.subscriptionPlan.deleteMany({ where: { id: subscriptionPlanId } });
  await prisma.$disconnect();
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function createSubscription(userId: string) {
  return prisma.subscription.create({
    data: {
      userId,
      planId: subscriptionPlanId,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

// ── Create Bot ─────────────────────────────────────────────────────────────

describe("createBot", () => {
  it("should reject duplicate bot creation with 409", async () => {
    // testUserId already has a bot from beforeAll
    await expect(
      botService.createBot(testUserId),
    ).rejects.toThrow(ValidationError);
  });

  it("should reject bot creation without active subscription", async () => {
    // secondUserId has no subscription, so createBot should reject
    await expect(
      botService.createBot(secondUserId),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ── Get Bot ────────────────────────────────────────────────────────────────

describe("getBot", () => {
  it("should return bot with status and groups count", async () => {
    const bot = await botService.getBot(testUserId);

    expect(bot).toBeDefined();
    expect(bot?.id).toBe(testBotId);
    expect(bot?.status).toBeDefined();
    expect(bot?.groupsCount).toBeGreaterThanOrEqual(0);
  });

  it("should return null for user without bot", async () => {
    const bot = await botService.getBot(secondUserId);
    expect(bot).toBeNull();
  });
});

// ── Update Bot Status ──────────────────────────────────────────────────────

describe("updateBotStatus", () => {
  it("should update bot status to ONLINE", async () => {
    await botService.updateBotStatus(testBotId, "ONLINE", {
      phoneNumber: "628123456789",
      lastConnectedAt: new Date(),
    });

    const bot = await botService.getBot(testUserId);
    expect(bot?.status).toBe("ONLINE");
    expect(bot?.phoneNumber).toBe("628123456789");
  });

  it("should reject invalid status", async () => {
    await expect(
      botService.updateBotStatus(testBotId, "INVALID"),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw for non-existent bot", async () => {
    await expect(
      botService.updateBotStatus("non-existent-id", "ONLINE"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── QR Code ────────────────────────────────────────────────────────────────

describe("getQRCode", () => {
  it("should return qr code from session data", async () => {
    // Store a mock QR code first
    await prisma.bot.update({
      where: { id: testBotId },
      data: { sessionData: "mock-qr-code-data" },
    });

    const qr = await botService.getQRCode(testBotId);
    expect(qr.qrCode).toBe("mock-qr-code-data");
  });

  it("should return null if no QR available", async () => {
    await prisma.bot.update({
      where: { id: testBotId },
      data: { sessionData: null },
    });

    const qr = await botService.getQRCode(testBotId);
    expect(qr.qrCode).toBeNull();
  });
});

describe("storeQRCode", () => {
  it("should store QR code and set status to CONNECTING", async () => {
    await botService.storeQRCode(testBotId, "new-qr-data");

    const bot = await botService.getBot(testUserId);
    expect(bot?.sessionData).toBe("new-qr-data");
    expect(bot?.status).toBe("CONNECTING");
  });
});

// ── Session Management ─────────────────────────────────────────────────────

describe("deleteSession", () => {
  it("should clear session data and reset status", async () => {
    await botService.deleteSession(testBotId);

    const bot = await botService.getBot(testUserId);
    expect(bot?.sessionData).toBeNull();
    expect(bot?.status).toBe("OFFLINE");
    expect(bot?.lastConnectedAt).toBeNull();
  });
});

// ── Suspend / Activate ─────────────────────────────────────────────────────

describe("suspendBot / activateBot", () => {
  it("should suspend bot", async () => {
    await botService.suspendBot(testBotId);

    const bot = await botService.getBot(testUserId);
    expect(bot?.status).toBe("SUSPENDED");
  });

  it("should activate bot with active subscription", async () => {
    await botService.activateBot(testBotId);

    const bot = await botService.getBot(testUserId);
    expect(bot?.status).toBe("OFFLINE");
  });

  it("should reject activate without active subscription", async () => {
    // Delete subscription
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });

    await expect(
      botService.activateBot(testBotId),
    ).rejects.toThrow(ForbiddenError);
  });
});
