// ── Feature Toggle Service ─────────────────────────────────────────────────
// Manages feature toggle defaults, group overrides, and querying.

import prisma from "../config/database.js";
import { FEATURE_TOGGLES, FeatureKey } from "../config/features.js";
import { NotFoundError } from "../utils/errors.js";

/**
 * Get the default values for all feature toggles.
 */
export function getDefaults(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const [key, toggle] of Object.entries(FEATURE_TOGGLES)) {
    defaults[key] = toggle.defaultValue;
  }
  return defaults;
}

/**
 * Get merged toggles for a group — defaults overridden by group settings.
 */
export async function getGroupToggles(
  groupId: string,
): Promise<Record<string, boolean>> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { settings: true },
  });

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const defaults = getDefaults();

  if (!group.settings?.featureToggles) {
    return defaults;
  }

  const overrides = JSON.parse(group.settings.featureToggles) as Record<string, boolean>;

  // Merge: defaults with overrides applied on top
  return { ...defaults, ...overrides };
}

/**
 * Update feature toggles for a group (partial update — only specified keys).
 */
export async function updateToggles(
  groupId: string,
  toggles: Partial<Record<FeatureKey, boolean>>,
): Promise<Record<string, boolean>> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  // Get current merged state
  const current = await getGroupToggles(groupId);

  // Apply partial update, then filter out undefined values
  const updated = { ...current, ...toggles };
  const clean = Object.fromEntries(
    Object.entries(updated).filter(([, v]) => v !== undefined)
  ) as Record<string, boolean>;

  // Upsert the settings record
  await prisma.groupSettings.upsert({
    where: { groupId },
    create: {
      groupId,
      featureToggles: JSON.stringify(clean),
    },
    update: {
      featureToggles: JSON.stringify(clean),
    },
  });

  return clean;
}

/**
 * Check if a single feature toggle is enabled for a group.
 */
export async function isEnabled(
  groupId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const toggles = await getGroupToggles(groupId);
  return toggles[featureKey] ?? false;
}
