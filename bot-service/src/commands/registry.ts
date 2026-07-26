import type { WASocket } from "@whiskeysockets/baileys"

import { logger } from "../utils/logger.js"

// ── Types ──────────────────────────────────────────────────────────────────────

export type CommandPermission = "EVERYONE" | "ADMIN" | "OWNER" | "DISABLED"

export interface CommandContext {
  /** The WhatsApp socket (for replying) */
  socket: WASocket
  /** The chat / group JID */
  jid: string
  /** Whether the message is from a group */
  isGroup: boolean
  /** The sender's JID */
  sender: string
  /** The raw message text */
  text: string
  /** The command name (without prefix) */
  command: string
  /** Arguments after the command */
  args: string[]
  /** The original WAMessage for quoting */
  quoted?: unknown
}

export interface Command {
  /** Unique command name (e.g. "ping") */
  name: string
  /** Alternative names */
  aliases?: string[]
  /** Feature category for help display */
  category: string
  /** Who can execute this command */
  permission: CommandPermission
  /** Short description */
  description: string
  /** Usage hint (e.g. ".ping") */
  usage?: string
  /** The handler */
  execute(ctx: CommandContext): Promise<void>
}

// ── Registry ───────────────────────────────────────────────────────────────────

/**
 * CommandRegistry holds all available commands and dispatches execution.
 *
 * Commands are registered at startup and looked up by name or alias
 * when a user sends a matching message.
 */
export class CommandRegistry {
  private commands = new Map<string, Command>()

  /** Register one or more commands. */
  register(...commands: Command[]): void {
    for (const cmd of commands) {
      const key = cmd.name.toLowerCase()

      if (this.commands.has(key)) {
        logger.warn({ command: cmd.name }, "Overwriting existing command")
      }

      this.commands.set(key, cmd)

      // Register aliases
      for (const alias of cmd.aliases ?? []) {
        this.commands.set(alias.toLowerCase(), cmd)
      }

      logger.debug({ command: cmd.name, category: cmd.category }, "Command registered")
    }
  }

  /**
   * Look up a command by name or alias.
   * Returns undefined if not found.
   */
  get(name: string): Command | undefined {
    return this.commands.get(name.toLowerCase())
  }

  /**
   * Attempt to execute a command by name.
   * Returns true if a matching command was found and executed.
   */
  async execute(command: string, ctx: CommandContext): Promise<boolean> {
    const cmd = this.get(command)
    if (!cmd) return false

    if (cmd.permission === "DISABLED") {
      await ctx.socket.sendMessage(ctx.jid, {
        text: `⛔ Command "${cmd.name}" is currently disabled.`,
      })
      return true
    }

    try {
      await cmd.execute(ctx)
      return true
    } catch (error) {
      logger.error({ error, command: cmd.name }, "Command execution failed")
      await ctx.socket.sendMessage(ctx.jid, {
        text: `❌ Error executing command "${cmd.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return true
    }
  }

  /**
   * Returns all registered commands grouped by category.
   */
  getGrouped(): Map<string, Command[]> {
    const grouped = new Map<string, Command[]>()
    const seen = new Set<string>()

    for (const [key, cmd] of this.commands) {
      if (key !== cmd.name) continue // skip aliases
      if (seen.has(cmd.name)) continue
      seen.add(cmd.name)

      const existing = grouped.get(cmd.category) ?? []
      existing.push(cmd)
      grouped.set(cmd.category, existing)
    }

    return grouped
  }

  /**
   * Returns all primary commands (non-aliases).
   */
  list(): Command[] {
    const seen = new Set<string>()
    const result: Command[] = []

    for (const [, cmd] of this.commands) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name)
        result.push(cmd)
      }
    }

    return result
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

let _registry: CommandRegistry | null = null

/** Get or create the global command registry. */
export function getRegistry(): CommandRegistry {
  if (!_registry) {
    _registry = new CommandRegistry()
  }
  return _registry
}
