import api from "@/services/api";

export async function getBot() {
  const res = await api.get("/bot");
  return res.data?.data ?? res.data;
}

export async function createBot(name: string) {
  const res = await api.post("/bot", { name });
  return res.data?.data ?? res.data;
}

export async function connectBot() {
  const res = await api.post("/bot/connect");
  return res.data?.data ?? res.data;
}

export async function disconnectBot() {
  const res = await api.post("/bot/disconnect");
  return res.data?.data ?? res.data;
}

export async function getQR() {
  const res = await api.get("/bot/qr");
  return res.data?.data ?? res.data;
}

export async function resetSession() {
  const res = await api.post("/bot/reset-session");
  return res.data?.data ?? res.data;
}

export async function pairingBot(phone: string) {
  const res = await api.post("/bot/pairing", { phone });
  return res.data?.data ?? res.data;
}
