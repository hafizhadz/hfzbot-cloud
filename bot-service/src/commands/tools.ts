// ── Tools & Stalker ──────────────────────────────────────────────────────────

import { synox } from "../services/synox"

export const cuaca = {
  permission: "EVERYONE" as const,
  name: "cuaca",
  aliases: ["weather", "ramalan"],
  category: "Tools",
  description: "Cek cuaca kota",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .cuaca [nama kota]\nContoh: .cuaca Jakarta"
    const city = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/tools/cuaca?city=${city}`)
    if (!data) return "Kota tidak ditemukan."
    return `🌤️ *Cuaca ${args.join(" ")}*\n\n${synox.extract(data)}`
  }
}

export const ssweb = {
  permission: "EVERYONE" as const,
  name: "ssweb",
  aliases: ["screenshot", "ss"],
  category: "Tools",
  description: "Screenshot website",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .ssweb [url]\nContoh: .ssweb https://google.com"
    const url = encodeURIComponent(args[0])
    const data = await synox.getText(`/tools/ssweb?url=${url}&device=desktop`)
    return data ? `📸 Screenshot: ${args[0]}\n\n${data}` : "Gagal screenshot."
  }
}

export const jarak = {
  permission: "EVERYONE" as const,
  name: "jarak",
  aliases: ["distance", "dist"],
  category: "Tools",
  description: "Hitung jarak antar kota",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .jarak [kota_asal] [kota_tujuan]\nContoh: .jarak Jakarta Surabaya"
    const from = encodeURIComponent(args[0])
    const to = encodeURIComponent(args.slice(1).join(" "))
    const data = await synox.get(`/tools/distance?from=${from}&to=${to}`)
    if (!data) return "Gagal hitung jarak."
    return `📍 *Jarak*\n${args[0]} → ${args.slice(1).join(" ")}\n\n${synox.extract(data)}`
  }
}

export const stalkig = {
  permission: "EVERYONE" as const,
  name: "stalkig",
  aliases: ["igstalk", "instagramstalk"],
  category: "Stalker",
  description: "Lihat info Instagram user",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .stalkig [username]\nContoh: .stalkig timothyronaldd"
    const username = encodeURIComponent(args[0])
    const data = await synox.get(`/stalker/instagram?username=${username}`)
    if (!data) return "User tidak ditemukan."
    return `📸 *Instagram: ${args[0]}*\n\n${synox.extract(data)}`
  }
}

export const stalkgh = {
  permission: "EVERYONE" as const,
  name: "stalkgh",
  aliases: ["ghstalk", "githubstalk"],
  category: "Stalker",
  description: "Lihat info GitHub user",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .stalkgh [username]\nContoh: .stalkgh siputzx"
    const username = encodeURIComponent(args[0])
    const data = await synox.get(`/stalker/github?username=${username}`)
    if (!data) return "User tidak ditemukan."
    return `🐙 *GitHub: ${args[0]}*\n\n${synox.extract(data)}`
  }
}

export const cekwa = {
  permission: "EVERYONE" as const,
  name: "cekwa",
  aliases: ["whatsapp", "ceknomor"],
  category: "Tools",
  description: "Cek nomor WhatsApp terdaftar",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .cekwa [nomor]\nContoh: .cekwa 6281234567890"
    const nomor = encodeURIComponent(args[0])
    const data = await synox.get(`/check/cekwa?nomor=${nomor}`)
    if (!data) return "Gagal cek nomor."
    return `📱 *Cek WhatsApp*\n\n${synox.extract(data)}`
  }
}

export const darkjoke = {
  permission: "EVERYONE" as const,
  name: "darkjoke",
  aliases: ["jokegelap", "dj"],
  category: "Random",
  description: "Dapatkan dark joke random",
  execute: async (): Promise<string> => {
    const data = await synox.get("/random/darkjoke")
    return `💀 *Dark Joke*\n\n${synox.extract(data)}`
  }
}

export const berita = {
  permission: "EVERYONE" as const,
  name: "berita",
  aliases: ["news", "headline"],
  category: "Tools",
  description: "Berita terkini dari berbagai sumber",
  execute: async (args: string[]): Promise<string> => {
    const sumber = args.length ? encodeURIComponent(args[0]) : "cnnindonesia"
    const data = await synox.get(`/berita/${sumber}`)
    if (!data) return "Sumber berita tidak ditemukan. Pilih: cnnindonesia, detik, cnbcindonesia, antara"
    return `📰 *Berita ${args[0] || "CNN Indonesia"}*\n\n${synox.extract(data)}`
  }
}
