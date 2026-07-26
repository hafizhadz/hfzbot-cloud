// ── Group Service ──────────────────────────────────────────────────────────
// Business logic for group management — listing, settings, owners, admins.

import prisma from "../config/database.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GroupWithSettings {
  id: string;
  botId: string;
  groupJid: string;
  groupName: string | null;
  groupPhoto: string | null;
  memberCount: number;
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    featureToggles: Record<string, boolean> | null;
  } | null;
}

export interface GroupOwnerResult {
  id: string;
  groupId: string;
  userJid: string;
  role: string;
  addedBy: string | null;
  createdAt: Date;
}

export interface GroupAdminResult {
  id: string;
  groupId: string;
  userJid: string;
  addedBy: string | null;
  createdAt: Date;
}

// ── Get All Groups for a Bot ───────────────────────────────────────────────

/**
 * List all groups connected to a bot.
 */
export async function getGroups(botId: string): Promise<GroupWithSettings[]> {
  const groups = await prisma.group.findMany({
    where: { botId },
    include: { settings: true },
    orderBy: { joinedAt: "desc" },
  });

  return groups.map((g) => ({
    id: g.id,
    botId: g.botId,
    groupJid: g.groupJid,
    groupName: g.groupName,
    groupPhoto: g.groupPhoto,
    memberCount: g.memberCount,
    isActive: g.isActive,
    joinedAt: g.joinedAt,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    settings: g.settings
      ? {
          featureToggles: g.settings.featureToggles
            ? (JSON.parse(g.settings.featureToggles) as Record<string, boolean>)
            : null,
        }
      : null,
  }));
}

// ── Get Single Group ───────────────────────────────────────────────────────

/**
 * Get a single group with its settings.
 */
export async function getGroup(groupId: string): Promise<GroupWithSettings> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { settings: true },
  });

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  return {
    id: group.id,
    botId: group.botId,
    groupJid: group.groupJid,
    groupName: group.groupName,
    groupPhoto: group.groupPhoto,
    memberCount: group.memberCount,
    isActive: group.isActive,
    joinedAt: group.joinedAt,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    settings: group.settings
      ? {
          featureToggles: group.settings.featureToggles
            ? (JSON.parse(group.settings.featureToggles) as Record<string, boolean>)
            : null,
        }
      : null,
  };
}

// ── Get Group by JID ───────────────────────────────────────────────────────

/**
 * Find a group by its JID (used by bot service webhooks).
 */
export async function getGroupByJid(groupJid: string): Promise<GroupWithSettings> {
  const group = await prisma.group.findUnique({
    where: { groupJid },
    include: { settings: true },
  });

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  return {
    id: group.id,
    botId: group.botId,
    groupJid: group.groupJid,
    groupName: group.groupName,
    groupPhoto: group.groupPhoto,
    memberCount: group.memberCount,
    isActive: group.isActive,
    joinedAt: group.joinedAt,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    settings: group.settings
      ? {
          featureToggles: group.settings.featureToggles
            ? (JSON.parse(group.settings.featureToggles) as Record<string, boolean>)
            : null,
        }
      : null,
  };
}

// ── Update Group Settings ──────────────────────────────────────────────────

/**
 * Update group settings. Creates a GroupSettings record if none exists.
 */
export async function updateGroupSettings(
  groupId: string,
  settings: Record<string, unknown>,
): Promise<{ featureToggles: Record<string, boolean> | null }> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const upserted = await prisma.groupSettings.upsert({
    where: { groupId },
    create: {
      groupId,
      featureToggles: JSON.stringify(settings),
    },
    update: {
      featureToggles: JSON.stringify(settings),
    },
  });

  return {
    featureToggles: upserted.featureToggles
      ? (JSON.parse(upserted.featureToggles) as Record<string, boolean>)
      : null,
  };
}

// ── Group Owners ───────────────────────────────────────────────────────────

/**
 * List all owners of a group.
 */
export async function getOwners(groupId: string): Promise<GroupOwnerResult[]> {
  const owners = await prisma.groupOwner.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
  });

  return owners;
}

/**
 * Add an owner to a group.
 */
export async function addOwner(
  groupId: string,
  userJid: string,
  role: string,
  addedBy: string | null,
): Promise<GroupOwnerResult> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const validRoles = ["PRIMARY_OWNER", "CO_OWNER"];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role: ${role}. Must be PRIMARY_OWNER or CO_OWNER`);
  }

  const owner = await prisma.groupOwner.upsert({
    where: { groupId_userJid: { groupId, userJid } },
    create: { groupId, userJid, role: role as "PRIMARY_OWNER" | "CO_OWNER", addedBy },
    update: { role: role as "PRIMARY_OWNER" | "CO_OWNER", addedBy: addedBy ?? undefined },
  });

  return owner;
}

/**
 * Remove an owner from a group.
 */
export async function removeOwner(
  groupId: string,
  userJid: string,
): Promise<void> {
  const owner = await prisma.groupOwner.findUnique({
    where: { groupId_userJid: { groupId, userJid } },
  });

  if (!owner) {
    throw new NotFoundError("Owner not found");
  }

  await prisma.groupOwner.delete({
    where: { groupId_userJid: { groupId, userJid } },
  });
}

// ── Group Admins ───────────────────────────────────────────────────────────

/**
 * List all admins of a group.
 */
export async function getAdmins(groupId: string): Promise<GroupAdminResult[]> {
  const admins = await prisma.groupAdmin.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
  });

  return admins;
}

/**
 * Add an admin to a group.
 */
export async function addAdmin(
  groupId: string,
  userJid: string,
  addedBy: string | null,
): Promise<GroupAdminResult> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const admin = await prisma.groupAdmin.upsert({
    where: { groupId_userJid: { groupId, userJid } },
    create: { groupId, userJid, addedBy },
    update: { addedBy: addedBy ?? undefined },
  });

  return admin;
}

/**
 * Remove an admin from a group.
 */
export async function removeAdmin(
  groupId: string,
  userJid: string,
): Promise<void> {
  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userJid: { groupId, userJid } },
  });

  if (!admin) {
    throw new NotFoundError("Admin not found");
  }

  await prisma.groupAdmin.delete({
    where: { groupId_userJid: { groupId, userJid } },
  });
}
