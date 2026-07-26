// ── AI Chat ──────────────────────────────────────────────────────────────────

import { synox } from "../services/synox"

export const ai = {
  permission: "EVERYONE" as const,
  name: "ai",
  aliases: ["ask", "gpt", "chat"],
  category: "AI",
  description: "Tanya AI (Claude, Gemini, GPT, dll)",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .ai [pertanyaan]\nContoh: .ai apa itu bot WhatsApp?"
    
    const q = encodeURIComponent(args.join(" "))
    const models = [
      { name: "Claude", url: `/ai-chat/claude-haiku-4.5?q=${q}` },
      { name: "GPT", url: `/ai-chat/gpt-4o-mini?q=${q}` },
      { name: "Gemini", url: `/ai-chat/gemini-2.0?q=${q}` },
    ]

    // Try each model until one works
    for (const model of models) {
      const data = await synox.get(model.url)
      if (data) {
        const text = synox.extract(data)
        if (text && text !== "Error: API tidak merespon.") {
          return `🤖 *${model.name}*\n\n${text}`
        }
      }
    }
    return "Error: Semua model AI sibuk. Coba lagi nanti."
  }
}

export const aicoder = {
  permission: "EVERYONE" as const,
  name: "aicoder",
  aliases: ["coder", "coding"],
  category: "AI",
  description: "AI coding assistant",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .aicoder [perintah coding]\nContoh: .aicoder buat function hitung diskon"
    const prompt = encodeURIComponent(args.join(" "))
    const data = await synox.get(`/ai-chat/ai-coder?prompt=${prompt}`)
    return synox.extract(data)
  }
}
