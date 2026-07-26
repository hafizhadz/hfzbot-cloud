import { getRegistry, type Command } from "./registry"
import { fmt } from "../utils/format"

const specialHelps: Record<string, string> = {
  moderation: [
    "AUTOMATIC PROTECTION",
    "",
    "Anti Link",
    "  Deteksi dan menghapus link secara otomatis.",
    "",
    "Anti Flood",
    "  Mendeteksi spam pesan secara beruntun.",
    "",
    "Anti Capslock",
    "  Mendeteksi penggunaan huruf kapital berlebihan.",
    "",
    "Bad Word Filter",
    "  Menyaring kata yang dilarang.",
    "",
    "Anti Mention Spam",
    "  Membatasi mention berlebihan.",
    "",
    "Warning System",
    "  3 warning = Auto Kick",
    "",
  ].join("\n"),
  welcome: [
    "AUTOMATIC FEATURES",
    "",
    "Welcome Message",
    "  Menyambut member baru yang bergabung ke grup.",
    "",
    "Goodbye Message",
    "  Memberikan pesan saat member meninggalkan grup.",
    "",
    "Group Rules",
    "  .rules",
    "",
    "Auto Reply",
    "  Membalas pesan berdasarkan kata kunci yang telah diatur.",
    "",
  ].join("\n"),
  ai: [
    ".ai [pertanyaan]",
    "  Tanya AI mengenai berbagai hal.",
    "",
    ".aicoder [perintah]",
    "  Asisten AI untuk membantu pemrograman dan coding.",
    "",
    "AI PROVIDERS",
    "  Claude / GPT / Gemini",
    "",
  ].join("\n"),
  games: [
    ".quiz",
    "  Quiz asah otak.",
    "",
    ".caklontong",
    "  Permainan tebak kata.",
    "",
    ".family100",
    "  Tebak jawaban terpopuler.",
    "",
    ".susunkata",
    "  Susun kata yang diacak.",
    "",
    ".benaratausalah",
    "  Tebak pernyataan benar atau salah.",
    "",
    ".gamelist",
    "  Menampilkan daftar game.",
    "",
    ".gamedetail [slug]",
    "  Menampilkan detail game.",
    "",
  ].join("\n"),
  downloader: [
    ".ig [url]",
    "  Download media dari Instagram.",
    "",
    ".fb [url]",
    "  Download media dari Facebook.",
    "",
    ".tiktok [url]",
    "  Download media dari TikTok.",
    "",
  ].join("\n"),
  tools: [
    ".cuaca [kota]",
    "  Cek informasi cuaca.",
    "",
    ".ssweb [url]",
    "  Screenshot halaman website.",
    "",
    ".jarak [kota1] [kota2]",
    "  Menghitung jarak antar kota.",
    "",
    ".cekwa [nomor]",
    "  Mengecek informasi nomor.",
    "",
    ".cekpajak [plat] [provinsi]",
    "  Mengecek informasi pajak.",
    "",
    ".cekbpjs [NIK]",
    "  Mengecek tagihan BPJS.",
    "",
    ".cekpln [nopel]",
    "  Mengecek tagihan PLN.",
    "",
    ".encrypt [type] [teks]",
    "  Mengenkripsi teks.",
    "",
    ".decrypt [type] [teks]",
    "  Mendekripsi teks.",
    "",
    ".berita",
    "  Menampilkan berita terkini.",
    "",
    ".tempmail",
    "  Membuat email temporer.",
    "",
    ".mailinbox [email]",
    "  Mengecek inbox email temporer.",
    "",
  ].join("\n"),
  "social media": [
    ".stalkig [username]",
    "  Menampilkan informasi akun Instagram.",
    "",
    ".stalkgh [username]",
    "  Menampilkan informasi profil GitHub.",
    "",
  ].join("\n"),
  canvas: [
    ".brat [teks]",
    "  Membuat gambar dengan gaya Brat.",
    "",
    ".bratvid [teks]",
    "  Membuat video dengan gaya Brat.",
    "",
    ".blackpink [teks]",
    "  Membuat logo bergaya Blackpink.",
    "",
    ".pubglogo [teks]",
    "  Membuat logo bergaya PUBG.",
    "",
    ".applemusic [teks]",
    "  Membuat kartu bergaya Apple Music.",
    "",
    ".ephoto [style] [teks]",
    "  Membuat berbagai efek teks.",
    "",
    "Styles: 1917 / Glow / Cartoon /",
    "Neon / Gold / dan lainnya",
    "",
  ].join("\n"),
  "anime & movie": [
    ".anime [judul]",
    "  Mencari anime berdasarkan judul.",
    "",
    ".animeinfo [slug]",
    "  Menampilkan detail anime.",
    "",
    ".ongoing",
    "  Menampilkan anime ongoing.",
    "",
    ".completed",
    "  Menampilkan anime yang selesai.",
    "",
    ".movie [judul]",
    "  Mencari informasi film.",
    "",
    ".moviehome",
    "  Menampilkan film terbaru.",
    "",
  ].join("\n"),
  "komik & music": [
    ".komik",
    "  Menampilkan komik terbaru.",
    "",
    ".komikdetail [slug]",
    "  Menampilkan detail komik.",
    "",
    ".soundcloud [lagu]",
    "  Mencari lagu di SoundCloud.",
    "",
  ].join("\n"),
  primbon: [
    ".harilahir [tanggal]",
    "  Mengecek weton dan hari lahir.",
    "",
    ".mimpi [kata]",
    "  Menampilkan tafsir mimpi.",
    "",
    ".jodoh [nama1] [nama2]",
    "  Menampilkan ramalan kecocokan.",
    "",
    "Fitur ini hanya untuk hiburan.",
    "",
  ].join("\n"),
  random: [
    ".darkjoke",
    "  Menampilkan dark joke random.",
    "",
    ".randomimg",
    "  Menampilkan gambar random.",
    "",
    ".jkt48",
    "  Memutar musik JKT48 random.",
    "",
    ".fakta",
    "  Menampilkan fakta unik.",
    "",
  ].join("\n"),
  basic: [
    ".ping",
    "  Mengecek apakah bot sedang aktif.",
    "",
    ".help",
    "  Menampilkan bantuan command.",
    "",
    ".menu",
    "  Menampilkan menu utama.",
    "",
  ].join("\n"),
}

const categoryMap: Record<string, string> = {
  "general": "BASIC", "ai": "AI & CHAT", "games": "GAMES & QUIZ",
  "download": "DOWNLOADER", "tools": "TOOLS", "stalker": "SOCIAL MEDIA",
  "canvas": "CANVAS & EPHOTO", "anime": "ANIME & MOVIE", "movie": "MOVIE",
  "music": "MUSIC", "komik": "KOMIK & MUSIC", "primbon": "PRIMBON",
  "random": "RANDOM", "moderation": "MODERATION", "welcome": "WELCOME SYSTEM",
  "search": "SEARCH",
}

export const helpCommand: Command = {
  name: "help",
  aliases: ["h", "commands"],
  category: "General",
  permission: "EVERYONE",
  description: "Show commands by category.",
  usage: ".help",
  async execute(ctx) {
    const registry = getRegistry()
    const grouped = registry.getGrouped()
    const args = ctx.args
    const filter = args.length ? args.join(" ").toLowerCase() : ""

    if (filter) {
      // Check special categories first
      for (const [key, text] of Object.entries(specialHelps)) {
        if (key === filter || categoryMap[key]?.toLowerCase().includes(filter)) {
          const label = categoryMap[key] ?? key.toUpperCase()
          await ctx.socket.sendMessage(ctx.jid, { text: fmt(label, text) })
          return
        }
      }

      // Check registered command categories
      for (const [cat, cmds] of grouped) {
        const label = (categoryMap[cat.toLowerCase()] ?? cat).toLowerCase()
        if (!label.includes(filter) && cat.toLowerCase() !== filter) continue
        
        const body: string[] = []
        for (const cmd of cmds) {
          const usage = cmd.usage ?? `.${cmd.name}`
          body.push(`  ${usage}`)
          body.push(`  ${cmd.description}`)
          body.push("")
        }
        await ctx.socket.sendMessage(ctx.jid, { text: fmt(categoryMap[cat.toLowerCase()] ?? cat.toUpperCase(), body.join("\n")) })
        return
      }

      await ctx.socket.sendMessage(ctx.jid, { text: fmt("ERROR", `Kategori ${args.join(" ")} tidak ditemukan.`) })
      return
    }

    // Show all categories
    const body: string[] = []
    for (const [cat, cmds] of grouped) {
      const label = categoryMap[cat.toLowerCase()] ?? cat.toUpperCase()
      body.push(`  ${label}`)
      body.push(`  ${cmds.map(c => c.name).join(", ")}`)
      body.push("")
    }
    body.push("  Ketik .help <kategori>")
    body.push("  untuk detail setiap kategori.")

    await ctx.socket.sendMessage(ctx.jid, { text: fmt("COMMANDS", body.join("\n")) })
  },
}
