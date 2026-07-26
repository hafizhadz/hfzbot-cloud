import type { Command } from "./registry.js"

/**
 * .ping — Responds with "Pong!" to verify the bot is alive.
 */
export const pingCommand: Command = {
  name: "ping",
  aliases: ["p"],
  category: "General",
  permission: "EVERYONE",
  description: "Check if the bot is alive. Responds with Pong!",
  usage: ".ping",
  async execute(ctx) {
    await ctx.socket.sendMessage(ctx.jid, { text: "🏓 Pong!" })
  },
}
