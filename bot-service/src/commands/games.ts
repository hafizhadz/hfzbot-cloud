// ── Games ────────────────────────────────────────────────────────────────────

import { synox } from "../services/synox"

export const quiz = {
  permission: "EVERYONE" as const,
  name: "quiz",
  aliases: ["kuis"],
  category: "Games",
  description: "Main kuis asah otak",
  execute: async (): Promise<string> => {
    const data = await synox.get("/games/asah-otak")
    if (!data) return "Gagal ambil soal. Coba lagi."
    const soal = data.data ?? data.result ?? data
    const pertanyaan = (soal as Record<string, unknown>).soal ?? (soal as Record<string, unknown>).pertanyaan ?? JSON.stringify(soal)
    return `🧠 *Asah Otak*\n\n${pertanyaan}\n\nKetik .jawab [jawaban]`
  }
}

export const caklontong = {
  permission: "EVERYONE" as const,
  name: "caklontong",
  aliases: ["cak"],
  category: "Games",
  description: "Main Cak Lontong (tebak kata)",
  execute: async (): Promise<string> => {
    const data = await synox.get("/games/caklontong")
    if (!data) return "Gagal ambil soal."
    const soal = data.data ?? data.result ?? data
    const pertanyaan = (soal as Record<string, unknown>).soal ?? (soal as Record<string, unknown>).pertanyaan ?? JSON.stringify(soal)
    return `🎭 *Cak Lontong*\n\n${pertanyaan}\n\nKetik .jawab [jawaban]`
  }
}

export const family100 = {
  permission: "EVERYONE" as const,
  name: "family100",
  aliases: ["fam100", "f100"],
  category: "Games",
  description: "Main Family 100",
  execute: async (): Promise<string> => {
    const data = await synox.get("/games/familly100")
    if (!data) return "Gagal ambil soal."
    const soal = data.data ?? data.result ?? data
    return `👨‍👩‍👧‍👦 *Family 100*\n\n${JSON.stringify(soal, null, 2)}`
  }
}

export const susunkata = {
  permission: "EVERYONE" as const,
  name: "susunkata",
  aliases: ["sskata"],
  category: "Games",
  description: "Main susun kata",
  execute: async (): Promise<string> => {
    const data = await synox.get("/games/susun-kata")
    if (!data) return "Gagal ambil soal."
    const soal = data.data ?? data.result ?? data
    return `🔤 *Susun Kata*\n\n${JSON.stringify(soal, null, 2)}`
  }
}

export const benaratausalah = {
  permission: "EVERYONE" as const,
  name: "benaratausalah",
  aliases: ["bas", "benarsalah"],
  category: "Games",
  description: "Main benar atau salah",
  execute: async (): Promise<string> => {
    const data = await synox.get("/games/benaratausalah")
    if (!data) return "Gagal ambil soal."
    const soal = data.data ?? data.result ?? data
    return `✅❌ *Benar atau Salah*\n\n${JSON.stringify(soal, null, 2)}`
  }
}
