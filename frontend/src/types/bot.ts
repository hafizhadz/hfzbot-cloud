export type BotStatus = "OFFLINE" | "ONLINE" | "CONNECTING" | "DISCONNECTED" | "SUSPENDED";

export interface Bot {
  id: string;
  userId: string;
  name: string;
  phoneNumber?: string | null;
  status: BotStatus;
  sessionData?: string | null;
  lastConnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  groupsCount?: number;
  qr_code?: string;
}

// Compatibility
export interface BotCompat extends Bot {
  user_id: number;
  phone?: string;
  qr_code?: string;
  last_connected_at?: string;
  total_groups?: number;
  created_at: string;
  updated_at: string;
}
