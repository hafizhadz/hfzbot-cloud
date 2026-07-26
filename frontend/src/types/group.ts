export interface Group {
  id: string;
  botId: string;
  groupJid: string;
  groupName: string;
  groupPhoto?: string;
  memberCount: number;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  settings?: GroupSettings;
}

// Compatibility aliases for components using snake_case access
export interface GroupCompat extends Group {
  name: string;
  photo?: string;
  member_count: number;
  is_active: boolean;
  joined_at: string;
  bot_id: string;
  group_id: string;
}

export interface GroupOwner {
  id: number;
  user_id: string;
  name: string;
  phone?: string;
  is_primary: boolean;
  role: "primary" | "co-owner";
}

export type PermissionLevel = "everyone" | "admin" | "owner" | "disabled";

export interface AutoReplyPair {
  keyword: string;
  response: string;
}

export interface GroupSettings {
  /* Moderation */
  anti_link: boolean;
  anti_spam: boolean;
  anti_flood: boolean;
  anti_capslock: boolean;
  bad_word_filter: boolean;
  anti_mention: boolean;
  warning_system: boolean;
  mute: boolean;
  kick: boolean;
  ban: boolean;
  moderation_logs: boolean;

  /* Welcome */
  welcome_messages: boolean;
  welcome_message_text: string;
  goodbye_messages: boolean;
  goodbye_message_text: string;
  group_rules: boolean;
  group_rules_text: string;

  /* Games */
  games_enabled: boolean;
  quiz: boolean;
  guessing_games: boolean;
  rps: boolean;
  dice: boolean;
  coin_flip: boolean;

  /* Economy */
  economy_enabled: boolean;
  daily_reward: boolean;
  work: boolean;
  transfer: boolean;
  shop: boolean;

  /* Levels */
  xp_system: boolean;
  level_up_messages: boolean;
  leaderboard: boolean;

  /* Auto Reply */
  auto_reply: boolean;
  auto_replies: AutoReplyPair[];

  /* Permissions */
  permissions: Record<string, PermissionLevel>;

  /* Owners */
  owners: GroupOwner[];
}

export interface GroupSettingsUpdate {
  moderation?: Partial<
    Pick<
      GroupSettings,
      | "anti_link"
      | "anti_spam"
      | "anti_flood"
      | "anti_capslock"
      | "bad_word_filter"
      | "anti_mention"
      | "warning_system"
      | "mute"
      | "kick"
      | "ban"
      | "moderation_logs"
    >
  >;
  welcome?: Partial<
    Pick<
      GroupSettings,
      | "welcome_messages"
      | "welcome_message_text"
      | "goodbye_messages"
      | "goodbye_message_text"
      | "group_rules"
      | "group_rules_text"
    >
  >;
  games?: Partial<
    Pick<
      GroupSettings,
      "games_enabled" | "quiz" | "guessing_games" | "rps" | "dice" | "coin_flip"
    >
  >;
  economy?: Partial<
    Pick<
      GroupSettings,
      "economy_enabled" | "daily_reward" | "work" | "transfer" | "shop"
    >
  >;
  levels?: Partial<
    Pick<GroupSettings, "xp_system" | "level_up_messages" | "leaderboard">
  >;
  auto_reply?: Partial<
    Pick<GroupSettings, "auto_reply"> & { auto_replies: AutoReplyPair[] }
  >;
  permissions?: Record<string, PermissionLevel>;
  owners?: GroupOwner[];
}
