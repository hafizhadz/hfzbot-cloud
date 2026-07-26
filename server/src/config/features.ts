// ── Feature Toggle Definitions ──────────────────────────────────────────────
// All 30+ feature toggles grouped by category. Each toggle has a key, name,
// description, default value, and category. Group overrides are stored as JSON
// in GroupSettings.featureToggles.

export interface FeatureToggle {
  key: string;
  name: string;
  description: string;
  defaultValue: boolean;
  category: FeatureCategory;
}

export type FeatureCategory =
  | "moderation"
  | "games"
  | "economy"
  | "levels"
  | "welcome"
  | "analytics";

export const FEATURE_TOGGLES: Record<string, FeatureToggle> = {
  // ── Moderation ──────────────────────────────────────────────────────────
  anti_link: {
    key: "anti_link",
    name: "Anti Link",
    description: "Auto-detect and remove links",
    defaultValue: true,
    category: "moderation",
  },
  anti_spam: {
    key: "anti_spam",
    name: "Anti Spam",
    description: "Auto-detect and remove spam messages",
    defaultValue: true,
    category: "moderation",
  },
  anti_flood: {
    key: "anti_flood",
    name: "Anti Flood",
    description: "Limit consecutive messages from a single user",
    defaultValue: false,
    category: "moderation",
  },
  anti_capslock: {
    key: "anti_capslock",
    name: "Anti Capslock",
    description: "Auto-remove messages with excessive caps",
    defaultValue: false,
    category: "moderation",
  },
  bad_word_filter: {
    key: "bad_word_filter",
    name: "Bad Word Filter",
    description: "Filter offensive language",
    defaultValue: true,
    category: "moderation",
  },
  anti_mention: {
    key: "anti_mention",
    name: "Anti Mention",
    description: "Limit group mentions per message",
    defaultValue: false,
    category: "moderation",
  },
  warning_system: {
    key: "warning_system",
    name: "Warning System",
    description: "Issue warnings before automated actions",
    defaultValue: true,
    category: "moderation",
  },
  mute: {
    key: "mute",
    name: "Mute",
    description: "Ability to mute members",
    defaultValue: true,
    category: "moderation",
  },
  kick: {
    key: "kick",
    name: "Kick",
    description: "Ability to kick members from the group",
    defaultValue: true,
    category: "moderation",
  },
  ban: {
    key: "ban",
    name: "Ban",
    description: "Ability to ban members from the group",
    defaultValue: true,
    category: "moderation",
  },
  moderation_logs: {
    key: "moderation_logs",
    name: "Moderation Logs",
    description: "Log all moderation actions",
    defaultValue: true,
    category: "moderation",
  },

  // ── Games ───────────────────────────────────────────────────────────────
  quiz: {
    key: "quiz",
    name: "Quiz",
    description: "Trivia and quiz games",
    defaultValue: true,
    category: "games",
  },
  guessing_games: {
    key: "guessing_games",
    name: "Guessing Games",
    description: "Number and word guessing games",
    defaultValue: true,
    category: "games",
  },
  rps: {
    key: "rps",
    name: "Rock Paper Scissors",
    description: "Rock paper scissors game",
    defaultValue: true,
    category: "games",
  },
  dice: {
    key: "dice",
    name: "Dice",
    description: "Dice rolling game",
    defaultValue: true,
    category: "games",
  },
  coin_flip: {
    key: "coin_flip",
    name: "Coin Flip",
    description: "Coin flipping game",
    defaultValue: true,
    category: "games",
  },

  // ── Economy ─────────────────────────────────────────────────────────────
  economy_enabled: {
    key: "economy_enabled",
    name: "Economy System",
    description: "Enable virtual currency economy",
    defaultValue: true,
    category: "economy",
  },
  daily_reward: {
    key: "daily_reward",
    name: "Daily Reward",
    description: "Daily coin reward for members",
    defaultValue: true,
    category: "economy",
  },
  work: {
    key: "work",
    name: "Work",
    description: "Earn coins by working",
    defaultValue: true,
    category: "economy",
  },
  transfer: {
    key: "transfer",
    name: "Transfer",
    description: "Transfer coins between members",
    defaultValue: true,
    category: "economy",
  },
  shop: {
    key: "shop",
    name: "Shop",
    description: "In-group shop for items and roles",
    defaultValue: true,
    category: "economy",
  },

  // ── Levels ──────────────────────────────────────────────────────────────
  xp_system: {
    key: "xp_system",
    name: "XP System",
    description: "Earn XP by sending messages",
    defaultValue: true,
    category: "levels",
  },
  level_up_messages: {
    key: "level_up_messages",
    name: "Level Up Messages",
    description: "Notify when a member levels up",
    defaultValue: true,
    category: "levels",
  },
  leaderboard: {
    key: "leaderboard",
    name: "Leaderboard",
    description: "Show XP and level leaderboard",
    defaultValue: true,
    category: "levels",
  },

  // ── Welcome ─────────────────────────────────────────────────────────────
  welcome_messages: {
    key: "welcome_messages",
    name: "Welcome Messages",
    description: "Send welcome message when a new member joins",
    defaultValue: true,
    category: "welcome",
  },
  goodbye_messages: {
    key: "goodbye_messages",
    name: "Goodbye Messages",
    description: "Send goodbye message when a member leaves",
    defaultValue: true,
    category: "welcome",
  },
  auto_reply: {
    key: "auto_reply",
    name: "Auto Reply",
    description: "Auto-reply to keywords and triggers",
    defaultValue: false,
    category: "welcome",
  },
  group_rules: {
    key: "group_rules",
    name: "Group Rules",
    description: "Display group rules via command",
    defaultValue: true,
    category: "welcome",
  },

  // ── Analytics ───────────────────────────────────────────────────────────
  analytics: {
    key: "analytics",
    name: "Analytics",
    description: "Track group activity and generate insights",
    defaultValue: true,
    category: "analytics",
  },
};

/** All toggle keys as a union type for type safety. */
export type FeatureKey = keyof typeof FEATURE_TOGGLES;

/** All feature categories. */
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  "moderation",
  "games",
  "economy",
  "levels",
  "welcome",
  "analytics",
];
