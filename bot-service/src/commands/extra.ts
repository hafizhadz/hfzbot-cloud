// ── Additional Features ──────────────────────────────────────────────────────
// Movie, Music, Komik, Novel, Check, Uploader, Saweria, Tempmail, Ankergames

import { synox } from "../services/synox"

// ── Movie (LK21) ─────────────────────────────────────────────────────────────

export const movie = {
  name: "movie",
  permission: "EVERYONE" as const,
  aliases: ["film", "lk21"],
  category: "Movie",
  description: "Cari film dari LK21",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .movie [judul]\nContoh: .movie start up"
    const q = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/movie/lk21/search?query=${q}`)
    if (!data) return "Film tidak ditemukan."
    return synox.extract(data)
  }
}

export const moviehome = {
  name: "moviehome",
  permission: "EVERYONE" as const,
  aliases: ["filmhome", "layar"],
  category: "Movie",
  description: "Film terbaru dari LK21",
  execute: async (): Promise<string> => {
    const data = await synox.get("/movie/lk21/home?country=indonesia&page=1")
    if (!data) return "Gagal ambil daftar film."
    return synox.extract(data)
  }
}

// ── Music ────────────────────────────────────────────────────────────────────

export const soundcloud = {
  name: "soundcloud",
  permission: "EVERYONE" as const,
  aliases: ["sc", "scsearch"],
  category: "Music",
  description: "Cari lagu dari SoundCloud",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .soundcloud [judul lagu]\nContoh: .soundcloud shape of you"
    const q = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/music/soundcloud/search?query=${q}&limit=5`)
    if (!data) return "Lagu tidak ditemukan."
    return synox.extract(data)
  }
}

// ── Komik ────────────────────────────────────────────────────────────────────

export const komik = {
  name: "komik",
  permission: "EVERYONE" as const,
  aliases: ["manga", "comic"],
  category: "Komik",
  description: "Cari komik/manga",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .komik [judul]\nContoh: .komik one piece"
    const data = await synox.get(`/komik/komiku/latest`)
    if (!data) return "Komik tidak ditemukan."
    return synox.extract(data)
  }
}

export const komikdetail = {
  name: "komikdetail",
  permission: "EVERYONE" as const,
  aliases: ["mangainfo", "komikinfo"],
  category: "Komik",
  description: "Detail komik/manga",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .komikdetail [slug]\nContoh: .komikdetail one-piece"
    const url = encodeURIComponent(`https://komiku.org/manga/${args[0]}`)
    const data = await synox.get(`/komik/komiku/detail?url=${url}`)
    if (!data) return "Komik tidak ditemukan."
    return synox.extract(data)
  }
}

// ── Check ────────────────────────────────────────────────────────────────────

export const cekbpjs = {
  name: "cekbpjs",
  permission: "EVERYONE" as const,
  aliases: ["bpjs", "cekbpjsks"],
  category: "Tools",
  description: "Cek tagihan BPJS Kesehatan",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .cekbpjs [nomor]\nContoh: .cekbpjs 1234567890"
    const nik = encodeURIComponent(args[0])
    const data = await synox.get(`/check/cekbpjs?nik=${nik}`)
    if (!data) return "Data tidak ditemukan."
    return synox.extract(data)
  }
}

export const cekpln = {
  name: "cekpln",
  permission: "EVERYONE" as const,
  aliases: ["pln", "cektagihanpln"],
  category: "Tools",
  description: "Cek tagihan listrik PLN",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .cekpln [nomor pelanggan]\nContoh: .cekpln 1234567890"
    const nopel = encodeURIComponent(args[0])
    const data = await synox.get(`/check/cektagihanpln?nopel=${nopel}`)
    if (!data) return "Data tidak ditemukan."
    return synox.extract(data)
  }
}

export const cekpajak = {
  name: "cekpajak",
  permission: "EVERYONE" as const,
  aliases: ["pajak", "cekpajakkendaraan"],
  category: "Tools",
  description: "Cek pajak kendaraan bermotor",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .cekpajak [plat] [provinsi]\nContoh: .cekpajak B1234ABC DKI JAKARTA"
    const plat = encodeURIComponent(args[0])
    const prov = encodeURIComponent(args.slice(1).join(" "))
    const data = await synox.get(`/check/cekpajak?plat=${plat}&provinsi=${prov}`)
    if (!data) return "Data tidak ditemukan."
    return synox.extract(data)
  }
}

// ── Uploader ─────────────────────────────────────────────────────────────────

export const upload = {
  name: "upload",
  permission: "EVERYONE" as const,
  aliases: ["uploadfile", "share"],
  category: "Tools",
  description: "Upload file ke berbagai hosting",
  execute: async (): Promise<string> => {
    return "Gunakan .upload dengan media (foto/video) — bot akan upload otomatis."
  }
}

// ── Tempmail ─────────────────────────────────────────────────────────────────

export const tempmail = {
  name: "tempmail",
  permission: "EVERYONE" as const,
  aliases: ["mail", "emailtemporer"],
  category: "Tools",
  description: "Buat email temporer gratis",
  execute: async (): Promise<string> => {
    const data = await synox.get("/tempmail/tempmail-create-v3")
    if (!data) return "Gagal buat email."
    return synox.extract(data)
  }
}

export const tempmailinbox = {
  name: "mailinbox",
  permission: "EVERYONE" as const,
  aliases: ["inbox", "cekmail"],
  category: "Tools",
  description: "Cek inbox email temporer",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .mailinbox [email]\nContoh: .mailinbox abc123@tempmail.com"
    const email = encodeURIComponent(args[0])
    const data = await synox.get(`/tempmail/tempmail-inbox-v3?email=${email}&wait=false`)
    if (!data) return "Inbox kosong."
    return synox.extract(data)
  }
}

// ── Ankergames ───────────────────────────────────────────────────────────────

export const gamelist = {
  name: "gamelist",
  permission: "EVERYONE" as const,
  aliases: ["listgame", "daftargame"],
  category: "Games",
  description: "Daftar game populer",
  execute: async (): Promise<string> => {
    const data = await synox.get("/ankergames/home")
    if (!data) return "Gagal ambil daftar game."
    return synox.extract(data)
  }
}

export const gamedetail = {
  name: "gamedetail",
  permission: "EVERYONE" as const,
  aliases: ["gameinfo", "infogame"],
  category: "Games",
  description: "Detail game dari Ankergames",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .gamedetail [slug]\nContoh: .gamedetail minecraft"
    const slug = encodeURIComponent(args[0])
    const data = await synox.get(`/ankergames/detail?slug=${slug}`)
    if (!data) return "Game tidak ditemukan."
    return synox.extract(data)
  }
}
