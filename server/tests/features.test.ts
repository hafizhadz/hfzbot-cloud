// ── Feature Toggle Service Integration Tests ───────────────────────────────
// Tests toggle defaults, group toggles, updates, and partial updates.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";
import { FEATURE_TOGGLES } from "../src/config/features.js";
import * as featureToggleService from "../src/services/feature-toggle.service.js";
import { NotFoundError } from "../src/utils/errors.js";

// ── Test Data ──────────────────────────────────────────────────────────────

let testGroupId: string;
let testUserId: string;
let testBotId: string;

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();

  // Create a test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.create({
    data: {
      name: "Feature Test User",
      email: `feature-test-${Date.now()}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  testUserId = user.id;

  // Create a bot for the user
  const bot = await prisma.bot.create({
    data: {
      userId: testUserId,
      name: "Feature Test Bot",
      status: "OFFLINE",
    },
  });
  testBotId = bot.id;

  // Create a group
  const group = await prisma.group.create({
    data: {
      botId: testBotId,
      groupJid: `feature-test-${Date.now()}@g.us`,
      groupName: "Feature Test Group",
      memberCount: 10,
    },
  });
  testGroupId = group.id;
});

afterAll(async () => {
  // Clean up
  await prisma.groupSettings.deleteMany({ where: { groupId: testGroupId } });
  await prisma.group.deleteMany({ where: { id: testGroupId } });
  await prisma.bot.deleteMany({ where: { id: testBotId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.$disconnect();
});

// ── Default Toggles ────────────────────────────────────────────────────────

describe("getDefaults", () => {
  it("should return all feature toggles with default values", () => {
    const defaults = featureToggleService.getDefaults();

    // Check all FeatureToggle entries are present
    const toggleKeys = Object.keys(FEATURE_TOGGLES);
    expect(Object.keys(defaults)).toHaveLength(toggleKeys.length);

    // Verify a few specific values
    expect(defaults.anti_link).toBe(true);
    expect(defaults.anti_spam).toBe(true);
    expect(defaults.quiz).toBe(true);
    expect(defaults.economy_enabled).toBe(true);
    expect(defaults.xp_system).toBe(true);
    expect(defaults.welcome_messages).toBe(true);
    expect(defaults.analytics).toBe(true);
    expect(defaults.anti_flood).toBe(false);
    expect(defaults.auto_reply).toBe(false);
  });

  it("should match the default values defined in FEATURE_TOGGLES", () => {
    const defaults = featureToggleService.getDefaults();

    for (const [key, toggle] of Object.entries(FEATURE_TOGGLES)) {
      expect(defaults[key]).toBe(toggle.defaultValue);
    }
  });
});

// ── Get Group Toggles ──────────────────────────────────────────────────────

describe("getGroupToggles", () => {
  it("should return defaults when group has no settings override", async () => {
    const toggles = await featureToggleService.getGroupToggles(testGroupId);

    expect(toggles.anti_link).toBe(true);
    expect(toggles.anti_spam).toBe(true);
  });

  it("should merge defaults with group overrides", async () => {
    // Save some overrides
    await featureToggleService.updateToggles(testGroupId, {
      anti_link: false,
      quiz: false,
    });

    const toggles = await featureToggleService.getGroupToggles(testGroupId);

    // Overridden values
    expect(toggles.anti_link).toBe(false);
    expect(toggles.quiz).toBe(false);

    // Default values should still apply
    expect(toggles.anti_spam).toBe(true);
    expect(toggles.economy_enabled).toBe(true);
  });

  it("should throw NotFoundError for non-existent group", async () => {
    await expect(
      featureToggleService.getGroupToggles("non-existent-id"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── Update Toggles ─────────────────────────────────────────────────────────

describe("updateToggles", () => {
  it("should update specific toggles (partial update)", async () => {
    const result = await featureToggleService.updateToggles(testGroupId, {
      anti_link: false,
      anti_capslock: true,
    });

    expect(result.anti_link).toBe(false);
    expect(result.anti_capslock).toBe(true);

    // Other toggles should remain at defaults
    expect(result.anti_spam).toBe(true);
  });

  it("should persist updated toggles in the database", async () => {
    await featureToggleService.updateToggles(testGroupId, {
      anti_link: false,
    });

    const toggles = await featureToggleService.getGroupToggles(testGroupId);
    expect(toggles.anti_link).toBe(false);
  });

  it("should allow toggling values back", async () => {
    await featureToggleService.updateToggles(testGroupId, {
      anti_link: true,
    });

    const toggles = await featureToggleService.getGroupToggles(testGroupId);
    expect(toggles.anti_link).toBe(true);
  });
});

// ── isEnabled ──────────────────────────────────────────────────────────────

describe("isEnabled", () => {
  it("should return true for enabled toggles", async () => {
    await featureToggleService.updateToggles(testGroupId, {
      anti_link: true,
    });

    const enabled = await featureToggleService.isEnabled(testGroupId, "anti_link");
    expect(enabled).toBe(true);
  });

  it("should return false for disabled toggles", async () => {
    await featureToggleService.updateToggles(testGroupId, {
      anti_link: false,
    });

    const enabled = await featureToggleService.isEnabled(testGroupId, "anti_link");
    expect(enabled).toBe(false);
  });

  it("should return false for unknown feature key", async () => {
    const enabled = await featureToggleService.isEnabled(
      testGroupId,
      "non_existent" as never,
    );
    expect(enabled).toBe(false);
  });
});
