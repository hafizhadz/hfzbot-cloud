import { getRegistry } from "./registry.js"
import type { CommandContext } from "./registry.js"
import { fmt, fmtError } from "../utils/format.js"
import { pingCommand } from "./ping.js"
import { helpCommand } from "./help.js"
import { menuCommand } from "./menu.js"
import { ai, aicoder } from "./ai.js"
import { quiz, caklontong, family100, susunkata, benaratausalah } from "./games.js"
import { ig, fb, tiktok } from "./downloader.js"
import { cuaca, ssweb, jarak, stalkig, stalkgh, cekwa, darkjoke, berita } from "./tools.js"
import { brat, bratvid, blackpink, pubglogo, applemusic, ephoto } from "./canvas.js"
import { search, animesearch, animeinfo, animeongoing, animecomplete } from "./search-anime.js"
import { harilahir, primbonmimpi, primbonjodoh, encrypt, decrypt, randomimg, jkt48, fakta } from "./primbon-encrypt.js"
import { movie, moviehome, soundcloud, komik, komikdetail, cekbpjs, cekpln, cekpajak, tempmail, tempmailinbox, gamelist, gamedetail } from "./extra.js"

export function registerCommands(): void {
  const registry = getRegistry()
  // Basic commands (they have their own execute)
  registry.register(pingCommand)
  registry.register(helpCommand)
  registry.register(menuCommand)

  // All synox-powered commands
  const synoxCmds = [
    ai, aicoder,
    quiz, caklontong, family100, susunkata, benaratausalah,
    ig, fb, tiktok,
    cuaca, ssweb, jarak, stalkig, stalkgh, cekwa, darkjoke, berita,
    brat, bratvid, blackpink, pubglogo, applemusic, ephoto,
    search, animesearch, animeinfo, animeongoing, animecomplete,
    harilahir, primbonmimpi, primbonjodoh, encrypt, decrypt, randomimg, jkt48, fakta,
    movie, moviehome, soundcloud, komik, komikdetail, cekbpjs, cekpln, cekpajak,
    tempmail, tempmailinbox, gamelist, gamedetail,
  ]
  for (const cmd of synoxCmds) {
    registry.register({ ...cmd, execute: wrap(cmd) })
  }
}

function wrap(cmd: { name: string; execute: (args: string[]) => Promise<string> }) {
  return async (ctx: CommandContext) => {
    try {
      const text = await cmd.execute(ctx.args)
      const title = cmd.name.toUpperCase()
      await ctx.socket.sendMessage(ctx.jid, { text: fmt(title, text) })
    } catch (e) {
      await ctx.socket.sendMessage(ctx.jid, { text: fmtError(String(e)) })
    }
  }
}

export { getRegistry, CommandRegistry } from "./registry.js"
export type { Command, CommandContext, CommandPermission } from "./registry.js"
