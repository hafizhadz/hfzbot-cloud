import api from "@/services/api";

export async function getHistory(page = 1, perPage = 10) {
  const res = await api.get("/payments/history", {
    params: { page, per_page: perPage },
  });
  return res.data?.data ?? res.data;
}
