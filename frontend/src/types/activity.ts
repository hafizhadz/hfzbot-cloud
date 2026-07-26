export interface Activity {
  id: number;
  type: "subscription" | "bot_status" | "group_join" | "payment";
  description: string;
  created_at: string;
}
