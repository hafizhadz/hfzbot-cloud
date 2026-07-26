// ── Search & Anime ───────────────────────────────────────────────────────────

import { synox } from "../services/synox.js"

export const search = {
  name: "search",
  permission: "EVERYONE" as const,
  category: "Search",
  description: "Cari informasi dari berbagai sumber",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .search [query]\nContoh: .search anime naruto"
    const q = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/search/bing?q=${q}`)
    return `🔍 *Search: ${args.join(" ")}*\n\n${synox.extract(data)}`
  }
}

export const animesearch = {
  name: "anime",
  permission: "EVERYONE" as const,
  aliases: ["nonton", "animeinfo"],
  category: "Anime",
  description: "Cari info anime dari berbagai sumber",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .anime [judul anime]\nContoh: .anime one piece"
    const q = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/anime/otakudesu/search?q=${q}`)
    if (!data) return "Anime tidak ditemukan."
    return `🎬 *Anime: ${args.join(" ")}*\n\n${synox.extract(data)}`
  }
}

export const animeinfo = {
  name: "animeinfo",
  permission: "EVERYONE" as const,
  aliases: ["animedetail", "nimeinfo"],
  category: "Anime",
  description: "Detail anime lengkap",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .animeinfo [slug]\nContoh: .animeinfo one-piece"
    const slug = encodeURIComponent(args[0])
    const data = await synox.get(`/anime/otakudesu/detail?slug=${slug}`)
    if (!data) return "Anime tidak ditemukan."
    return `📺 *Detail Anime*\n\n${synox.extract(data)}`
  }
}

export const animeongoing = {
  name: "ongoing",
  permission: "EVERYONE" as const,
  aliases: ["animeongoing", "ongoinganime"],
  category: "Anime",
  description: "Daftar anime ongoing",
  execute: async (): Promise<string> => {
    const data = await synox.get("/anime/otakudesu/ongoing?page=1")
    return `📺 *Anime Ongoing*\n\n${synox.extract(data)}`
  }
}

export const animecomplete = {
  name: "completed",
  permission: "EVERYONE" as const,
  aliases: ["animecomplete", "completeanime"],
  category: "Anime",
  description: "Daftar anime completed",
  execute: async (): Promise<string> => {
    const data = await synox.get("/anime/otakudesu/complete?page=1")
    return `✅ *Anime Completed*\n\n${synox.extract(data)}`
  }
}
