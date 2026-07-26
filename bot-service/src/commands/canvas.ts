// ── Canvas & Ephoto ──────────────────────────────────────────────────────────
// Image generation with text overlays

import { synox } from "../services/synox.js"

export const brat = {
  name: "brat",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat gambar style brat dengan teks",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .brat [teks]\nContoh: .brat HfzBot Cloud"
    const text = encodeURIComponent(args.join(" "))
    const data = await synox.getText(`/canvas/brat?text=${text}`)
    return data || "Gagal generate."
  }
}

export const bratvid = {
  name: "bratvid",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat video brat dengan teks",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .bratvid [teks]\nContoh: .bratvid HfzBot"
    const text = encodeURIComponent(args.join(" "))
    const data = await synox.getText(`/canvas/bratvid-gojo?text=${text}`)
    return data || "Gagal generate."
  }
}

export const blackpink = {
  name: "blackpink",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat logo style Blackpink",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .blackpink [teks]\nContoh: .blackpink HfzBot"
    const text = encodeURIComponent(args[0])
    // Try multiple ephoto styles
    const styles = ["blackpinklogo", "blackpinkstyle", "advancedglow"]
    for (const style of styles) {
      const data = await synox.getText(`/ephoto/${style}?text=${text}`)
      if (data) return data
    }
    return "Gagal generate logo."
  }
}

export const pubglogo = {
  name: "pubglogo",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat logo style PUBG Mobile",
  execute: async (args: string[]): Promise<string> => {
    if (!args.length) return "Gunakan: .pubglogo [teks]\nContoh: .pubglogo Squad"
    const text = encodeURIComponent(args[0])
    const data = await synox.getText(`/canvas/balogo?left=${text}&RIGHT=TEAM`)
    return data || "Gagal generate."
  }
}

export const applemusic = {
  name: "applemusic",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat card style Apple Music",
  execute: async (args: string[]): Promise<string> => {
    const title = args.length ? encodeURIComponent(args.join(" ")) : "HfzBot"
    const data = await synox.getText(`/canvas/applemusic?title=${title}&artist=Bot&cover=https://via.placeholder.com/300`)
    return data || "Gagal generate."
  }
}

export const ephoto = {
  name: "ephoto",
  permission: "EVERYONE" as const,
  category: "Canvas",
  description: "Buat teks dengan efek keren (1917, glow, cartoon, dll)",
  execute: async (args: string[]): Promise<string> => {
    if (args.length < 2) return "Gunakan: .ephoto [style] [teks]\nStyle: 1917, glow, cartoon, neon, gold, matrix\nContoh: .ephoto glow HfzBot"
    const style = args[0].toLowerCase()
    const text = encodeURIComponent(args.slice(1).join(" "))
    const styleMap: Record<string, string> = {
      "1917": "1917style", "glow": "advancedglow", "cartoon": "cartoonstyle",
      "neon": "neonlight", "gold": "goldtext", "matrix": "matrixstyle",
      "fire": "firetext", "water": "watertext", "3d": "3dstyle",
    }
    const endpoint = styleMap[style]
    if (!endpoint) return `Style tidak tersedia. Pilih: ${Object.keys(styleMap).join(", ")}`
    const data = await synox.getText(`/ephoto/${endpoint}?text=${text}`)
    return data || "Gagal generate."
  }
}
