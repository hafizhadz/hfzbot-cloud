// ── Downloader ───────────────────────────────────────────────────────────────

import { synox } from "../services/synox.js"

export const ig = {
  permission: "EVERYONE" as const,
  name: "ig",
  aliases: ["instagram", "igdl"],
  category: "Download",
  description: "Download Instagram video/foto",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .ig [url Instagram]"
    const url = encodeURIComponent(args[0])
    const data = await synox.get(`/download/instagram?url=${url}`)
    if (!data) return "Gagal download. Cek URL-nya."
    return synox.extract(data)
  }
}

export const fb = {
  permission: "EVERYONE" as const,
  name: "fb",
  aliases: ["facebook", "fbdl"],
  category: "Download",
  description: "Download Facebook video",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .fb [url Facebook]"
    const url = encodeURIComponent(args[0])
    const data = await synox.get(`/download/facebook?url=${url}`)
    if (!data) return "Gagal download."
    return synox.extract(data)
  }
}

export const tiktok = {
  permission: "EVERYONE" as const,
  name: "tiktok",
  aliases: ["tt", "ttdl"],
  category: "Download",
  description: "Download TikTok video tanpa watermark",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .tiktok [url TikTok]"
    const url = encodeURIComponent(args[0])
    const data = await synox.get(`/download/all-in-one?url=${url}`)
    if (!data) return "Gagal download."
    return synox.extract(data)
  }
}
