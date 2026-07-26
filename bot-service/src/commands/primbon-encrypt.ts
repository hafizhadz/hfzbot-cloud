// ── Primbon, Encrypt, Random ────────────────────────────────────────────────

import { synox } from "../services/synox"

// ── Primbon (Indonesian Fortune Telling) ─────────────────────────────────────

export const harilahir = {
  name: "harilahir",
  permission: "EVERYONE" as const,
  aliases: ["weton", "hari"],
  category: "Primbon",
  description: "Cek weton / hari lahir Jawa",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .harilahir [tanggal]\nContoh: .harilahir 1995-08-17"
    const tgl = encodeURIComponent(args[0])
    const data = await synox.get(`/primbon/harilahir?tanggal=${tgl}`)
    if (!data) return "Tanggal tidak valid."
    return `📅 *Hari Lahir*\n${args[0]}\n\n${synox.extract(data)}`
  }
}

export const primbonmimpi = {
  name: "mimpi",
  permission: "EVERYONE" as const,
  aliases: ["tafsirmimpi", "artimimpi"],
  category: "Primbon",
  description: "Tafsir mimpi / arti mimpi",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .mimpi [kata kunci]\nContoh: .mimpi ular"
    const q = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/primbon/mimpi?keyword=${q}`)
    if (!data) return "Mimpi tidak ditemukan."
    return `😴 *Tafsir Mimpi: ${args.join(" ")}*\n\n${synox.extract(data)}`
  }
}

export const primbonjodoh = {
  name: "jodoh",
  permission: "EVERYONE" as const,
  aliases: ["ramaljodoh", "cinta"],
  category: "Primbon",
  description: "Ramalan jodoh berdasarkan nama",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .jodoh [nama1] [nama2]\nContoh: .jodoh Andi Siti"
    const nama1 = encodeURIComponent(args[0])
    const data = await synox.get(`/primbon/pasaran?pasaran=${nama1}`)
    if (!data) return "Gagal ramal."
    return `💕 *Ramalan Jodoh*\n${args[0]} ❤️ ${args[1]}\n\n${synox.extract(data)}`
  }
}

// ── Encrypt / Decrypt ────────────────────────────────────────────────────────

export const encrypt = {
  name: "encrypt",
  permission: "EVERYONE" as const,
  aliases: ["encode", "enkripsi"],
  category: "Tools",
  description: "Enkripsi teks (AES, MD5, SHA, Base64, dll)",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .encrypt [type] [teks]\nType: md5, sha256, base64, aes\nContoh: .encrypt md5 HfzBot"
    const type = args[0].toLowerCase()
    const text = encodeURIComponent(args.slice(1).join(" "))
    const typeMap: Record<string, string> = {
      "md5": "MD5-hash", "sha256": "SHA256-hash", "sha1": "SHA1-hash",
      "base64": "Base64-encode", "aes": "AES-Encrypt",
    }
    const endpoint = typeMap[type]
    if (!endpoint) return `Type tidak tersedia. Pilih: ${Object.keys(typeMap).join(", ")}`
    const data = await synox.get(`/encrypt/${endpoint}?text=${text}`)
    return `🔐 *${type.toUpperCase()}*\n${args.slice(1).join(" ")}\n\n${synox.extract(data)}`
  }
}

export const decrypt = {
  name: "decrypt",
  permission: "EVERYONE" as const,
  aliases: ["decode", "deskripsi"],
  category: "Tools",
  description: "Dekripsi teks (AES, Base64, dll)",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .decrypt [type] [teks]\nType: base64, aes\nContoh: .decrypt base64 SGZ6Qm90"
    const type = args[0].toLowerCase()
    const text = encodeURIComponent(args.slice(1).join(" "))
    const typeMap: Record<string, string> = {
      "base64": "Base64-decode", "aes": "AES-Decrypt",
    }
    const endpoint = typeMap[type]
    if (!endpoint) return `Type tidak tersedia. Pilih: ${Object.keys(typeMap).join(", ")}`
    const data = await synox.get(`/encrypt/${endpoint}?text=${text}`)
    return `🔓 *${type.toUpperCase()}*\n\n${synox.extract(data)}`
  }
}

// ── Random ───────────────────────────────────────────────────────────────────

export const randomimg = {
  name: "randomimg",
  permission: "EVERYONE" as const,
  aliases: ["randimg", "gambarrandom"],
  category: "Random",
  description: "Gambar random (anime, waifu, dll)",
  execute: async (): Promise<string> => {
    const data = await synox.getText("/random/bluearchive")
    return data || "Gagal ambil gambar."
  }
}

export const jkt48 = {
  name: "jkt48",
  permission: "EVERYONE" as const,
  aliases: ["jkt", "48"],
  category: "Random",
  description: "Random musik JKT48",
  execute: async (): Promise<string> => {
    const data = await synox.getText("/random/jkt48-Music")
    return data ? `🎵 *JKT48 Music*\n\n${data}` : "Gagal ambil."
  }
}

export const fakta = {
  name: "fakta",
  permission: "EVERYONE" as const,
  aliases: ["fact", "faktaunik"],
  category: "Random",
  description: "Fakta unik random",
  execute: async (): Promise<string> => {
    const data = await synox.get("/random/darkjoke")
    return `💡 *Fakta Unik*\n\n${synox.extract(data)}`
  }
}
