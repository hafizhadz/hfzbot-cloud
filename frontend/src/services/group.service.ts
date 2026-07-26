import api from "@/services/api";
import type { GroupSettingsUpdate } from "@/types";

export async function getGroups(search?: string) {
  const res = await api.get("/groups", { params: { search } });
  const data = res.data?.data ?? res.data;
  return data?.groups ?? data ?? [];
}

export async function getGroup(id: number | string) {
  const res = await api.get(`/groups/${id}`);
  return res.data?.data ?? res.data;
}

export async function updateSettings(
  id: number | string,
  settings: GroupSettingsUpdate
) {
  const res = await api.put(`/groups/${id}/settings`, settings);
  return res.data?.data ?? res.data;
}

export async function updateToggles(
  id: number | string,
  section: string,
  toggles: Record<string, boolean>
) {
  const res = await api.put(`/groups/${id}/settings`, {
    [section]: toggles,
  });
  return res.data?.data ?? res.data;
}
