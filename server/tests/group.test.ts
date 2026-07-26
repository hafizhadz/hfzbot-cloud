// ── Group Service Integration Tests ────────────────────────────────────────
// Tests group listing, settings, owners, and admins management.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";
import * as groupService from "../src/services/group.service.js";
import { NotFoundError, ValidationError } from "../src/utils/errors.js";

// ── Test Data ──────────────────────────────────────────────────────────────

let testUserId: string;
let testBotId: string;
let testGroupId: string;
let testGroupJid: string;
let subscriptionPlanId: string;

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();

  // Create subscription plan
  const plan = await prisma.subscriptionPlan.create({
    data: {
      id: `test-plan-group-${Date.now()}`,
      name: "Test Plan Group",
      price: 10000,
      durationDays: 30,
      active: true,
    },
  });
  subscriptionPlanId = plan.id;

  // Create test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.create({
    data: {
      name: "Group Test User",
      email: `group-test-${Date.now()}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  testUserId = user.id;

  // Create subscription
  await prisma.subscription.create({
    data: {
      userId: testUserId,
      planId: subscriptionPlanId,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create bot
  const bot = await prisma.bot.create({
    data: {
      userId: testUserId,
      name: "Group Test Bot",
      status: "OFFLINE",
    },
  });
  testBotId = bot.id;

  // Create test group
  testGroupJid = `group-test-${Date.now()}@g.us`;
  const group = await prisma.group.create({
    data: {
      botId: testBotId,
      groupJid: testGroupJid,
      groupName: "Test Group",
      memberCount: 25,
    },
  });
  testGroupId = group.id;

  // Create a second group
  await prisma.group.create({
    data: {
      botId: testBotId,
      groupJid: `group-test-2-${Date.now()}@g.us`,
      groupName: "Test Group 2",
      memberCount: 15,
    },
  });
});

afterAll(async () => {
  // Clean up
  await prisma.groupSettings.deleteMany({ where: { groupId: testGroupId } });
  await prisma.groupOwner.deleteMany({ where: { groupId: testGroupId } });
  await prisma.groupAdmin.deleteMany({ where: { groupId: testGroupId } });
  await prisma.group.deleteMany({ where: { botId: testBotId } });
  await prisma.bot.deleteMany({ where: { id: testBotId } });
  await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.subscriptionPlan.deleteMany({ where: { id: subscriptionPlanId } });
  await prisma.$disconnect();
});

// ── List Groups ────────────────────────────────────────────────────────────

describe("getGroups", () => {
  it("should list all groups for a bot", async () => {
    const groups = await groupService.getGroups(testBotId);

    expect(groups).toHaveLength(2);
    expect(groups[0].botId).toBe(testBotId);
    expect(groups[0].groupName).toBeDefined();
  });

  it("should return empty array for bot with no groups", async () => {
    const groups = await groupService.getGroups("non-existent-id");
    expect(groups).toHaveLength(0);
  });
});

// ── Get Single Group ───────────────────────────────────────────────────────

describe("getGroup", () => {
  it("should return group with settings", async () => {
    const group = await groupService.getGroup(testGroupId);

    expect(group).toBeDefined();
    expect(group.id).toBe(testGroupId);
    expect(group.groupJid).toBe(testGroupJid);
    expect(group.groupName).toBe("Test Group");
    expect(group.memberCount).toBe(25);
  });

  it("should throw NotFoundError for non-existent group", async () => {
    await expect(
      groupService.getGroup("non-existent-id"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── Update Group Settings ──────────────────────────────────────────────────

describe("updateGroupSettings", () => {
  it("should update settings for a group", async () => {
    const settings = { anti_link: false, anti_spam: true };
    const result = await groupService.updateGroupSettings(testGroupId, settings);

    expect(result.featureToggles).toBeDefined();
    expect(result.featureToggles?.anti_link).toBe(false);
    expect(result.featureToggles?.anti_spam).toBe(true);
  });

  it("should overwrite existing settings", async () => {
    const settings = { anti_link: true, quiz: false };
    const result = await groupService.updateGroupSettings(testGroupId, settings);

    expect(result.featureToggles?.anti_link).toBe(true);
    expect(result.featureToggles?.quiz).toBe(false);
  });

  it("should throw NotFoundError for non-existent group", async () => {
    await expect(
      groupService.updateGroupSettings("non-existent-id", {}),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── Group Owners ───────────────────────────────────────────────────────────

describe("group owners", () => {
  const ownerJid = "6281234567890@s.whatsapp.net";

  afterEach(async () => {
    await prisma.groupOwner.deleteMany({
      where: { groupId: testGroupId },
    });
  });

  it("should add owner to group", async () => {
    const owner = await groupService.addOwner(testGroupId, ownerJid, "PRIMARY_OWNER", null);

    expect(owner.groupId).toBe(testGroupId);
    expect(owner.userJid).toBe(ownerJid);
    expect(owner.role).toBe("PRIMARY_OWNER");
  });

  it("should list owners of a group", async () => {
    await groupService.addOwner(testGroupId, ownerJid, "CO_OWNER", null);

    const owners = await groupService.getOwners(testGroupId);
    expect(owners).toHaveLength(1);
    expect(owners[0].userJid).toBe(ownerJid);
  });

  it("should remove owner from group", async () => {
    await groupService.addOwner(testGroupId, ownerJid, "CO_OWNER", null);
    await groupService.removeOwner(testGroupId, ownerJid);

    const owners = await groupService.getOwners(testGroupId);
    expect(owners).toHaveLength(0);
  });

  it("should throw NotFoundError when removing non-existent owner", async () => {
    await expect(
      groupService.removeOwner(testGroupId, "non-existent-jid"),
    ).rejects.toThrow(NotFoundError);
  });

  it("should reject invalid role", async () => {
    await expect(
      groupService.addOwner(testGroupId, ownerJid, "INVALID_ROLE", null),
    ).rejects.toThrow(ValidationError);
  });
});

// ── Group Admins ───────────────────────────────────────────────────────────

describe("group admins", () => {
  const adminJid = "6281234567891@s.whatsapp.net";

  afterEach(async () => {
    await prisma.groupAdmin.deleteMany({
      where: { groupId: testGroupId },
    });
  });

  it("should add admin to group", async () => {
    const admin = await groupService.addAdmin(testGroupId, adminJid, null);

    expect(admin.groupId).toBe(testGroupId);
    expect(admin.userJid).toBe(adminJid);
  });

  it("should list admins of a group", async () => {
    await groupService.addAdmin(testGroupId, adminJid, null);

    const admins = await groupService.getAdmins(testGroupId);
    expect(admins).toHaveLength(1);
    expect(admins[0].userJid).toBe(adminJid);
  });

  it("should remove admin from group", async () => {
    await groupService.addAdmin(testGroupId, adminJid, null);
    await groupService.removeAdmin(testGroupId, adminJid);

    const admins = await groupService.getAdmins(testGroupId);
    expect(admins).toHaveLength(0);
  });

  it("should throw NotFoundError when removing non-existent admin", async () => {
    await expect(
      groupService.removeAdmin(testGroupId, "non-existent-jid"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── Group by JID ───────────────────────────────────────────────────────────

describe("getGroupByJid", () => {
  it("should find group by JID", async () => {
    const group = await groupService.getGroupByJid(testGroupJid);

    expect(group).toBeDefined();
    expect(group.id).toBe(testGroupId);
    expect(group.groupJid).toBe(testGroupJid);
  });

  it("should throw NotFoundError for unknown JID", async () => {
    await expect(
      groupService.getGroupByJid("unknown@g.us"),
    ).rejects.toThrow(NotFoundError);
  });
});
