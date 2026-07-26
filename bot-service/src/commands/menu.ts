import { getRegistry, type Command } from "./registry.js"
import { fmt } from "../utils/format.js"

export const menuCommand: Command = {
  name: "menu",
  aliases: ["m", "start"],
  category: "General",
  permission: "EVERYONE",
  description: "Show the bot menu with all feature categories.",
  usage: ".menu",
  async execute(ctx) {
    const registry = getRegistry()
    const grouped = registry.getGrouped()
    
    const categoryOrder = [
      "Moderation", "Welcome", "AI", "Games", "Download",
      "Tools", "Stalker", "Canvas", "Anime", "Movie", "Music",
      "Komik", "Primbon", "Random", "General", "Search",
    ]
    
    const categoryNames: Record<string, string> = {
      "General": "BASIC", "AI": "AI & CHAT", "Games": "GAMES & QUIZ",
      "Download": "DOWNLOADER", "Tools": "TOOLS", "Stalker": "SOCIAL MEDIA",
      "Canvas": "CANVAS & EPHOTO", "Anime": "ANIME & MOVIE", "Movie": "MOVIE",
      "Music": "MUSIC", "Komik": "KOMIK", "Primbon": "PRIMBON",
      "Random": "RANDOM", "Moderation": "MODERATION", "Welcome": "WELCOME SYSTEM",
      "Search": "SEARCH",
    }
    
    const body: string[] = []
    body.push(`  Halo, @${ctx.sender.split("@")[0]}`)
    body.push(`  Prefix : .`)
    body.push(`  Status : Online`)
    body.push("")
    body.push("  ──────── MENU ────────")
    body.push("")
    
    let num = 1
    for (const cat of categoryOrder) {
      const cmds = grouped.get(cat)
      if (!cmds || cmds.length === 0) continue
      const label = categoryNames[cat] ?? cat.toUpperCase()
      body.push(`  [${String(num).padStart(2, "0")}] ${label}`)
      num++
    }
    
    body.push("")
    body.push("  Ketik .help <kategori>")
    body.push("  untuk melihat daftar command.")
    
    await ctx.socket.sendMessage(ctx.jid, { text: fmt("HFZBOT", body.join("\n")) })
  },
}
