export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  maxDevices: number;
  active?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
  startedAt: string;
  expiresAt: string;
  daysRemaining: number;
  createdAt: string;
}
