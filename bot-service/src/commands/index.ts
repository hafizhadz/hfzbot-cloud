import { getRegistry } from "./registry"
import type { CommandContext } from "./registry"
import { fmt, fmtError } from "../utils/format"
import { pingCommand } from "./ping"
import { helpCommand } from "./help"
import { menuCommand } from "./menu"
import { ai, aicoder } from "./ai"
import { quiz, caklontong, family100, susunkata, benaratausalah } from "./games"
import { ig, fb, tiktok } from "./downloader"
import { cuaca, ssweb, jarak, stalkig, stalkgh, cekwa, darkjoke, berita } from "./tools"
import { brat, bratvid, blackpink, pubglogo, applemusic, ephoto } from "./canvas"
import { search, animesearch, animeinfo, animeongoing, animecomplete } from "./search-anime"
import { harilahir, primbonmimpi, primbonjodoh, encrypt, decrypt, randomimg, jkt48, fakta } from "./primbon-encrypt"
import { movie, moviehome, soundcloud, komik, komikdetail, cekbpjs, cekpln, cekpajak, tempmail, tempmailinbox, gamelist, gamedetail } from "./extra"

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

export { getRegistry, CommandRegistry } from "./registry"
export type { Command, CommandContext, CommandPermission } from "./registry"
