import api from "@/services/api";

export interface CreateSubscriptionResult {
  subscriptionId: string;
  paymentUrl: string;
  qrImage?: string;
  amount: number;
  fee?: number;
  total?: number;
  expiredAt?: string;
  transactionId: string;
  message: string;
}

export async function getPlans() {
  const res = await api.get("/subscription/plans");
  const data = res.data?.data ?? res.data;
  return data?.plans ?? data ?? [];
}

export async function getCurrent() {
  const res = await api.get("/subscription/current");
  const data = res.data?.data ?? res.data;
  return data?.subscription ?? data ?? null;
}

export async function createSubscription(planId: string): Promise<CreateSubscriptionResult> {
  const res = await api.post("/subscription/create", { planId });
  return res.data?.data ?? res.data;
}

export async function cancelSubscription() {
  const res = await api.post("/subscription/cancel");
  return res.data?.data ?? res.data;
}

export async function checkPaymentStatus(transactionId: string) {
  const res = await api.get(`/payments/status/${transactionId}`);
  return res.data?.data ?? res.data;
}
