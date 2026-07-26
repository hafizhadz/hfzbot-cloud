export interface Payment {
  id: number;
  user_id: number;
  plan_id: number;
  plan_name: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  transaction_id: string;
  payment_method: string;
  paid_at?: string;
  created_at: string;
}

export interface PaymentHistoryResponse {
  data: Payment[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
