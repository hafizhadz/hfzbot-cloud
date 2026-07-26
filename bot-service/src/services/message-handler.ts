import { getContentType } from "@whiskeysockets/baileys"
import type { WAMessage, WASocket } from "@whiskeysockets/baileys"

import { logger } from "../utils/logger.js"
import { getRegistry } from "../commands/registry.js"
import { handleModeration } from "../modules/moderation.js"
import { handleWelcomeMessage } from "../modules/welcome.js"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProcessedMessage {
  /** Chat/group JID */
  jid: string
  /** The raw text content */
  text: string
  /** Baileys message content type */
  type: string
  /** Whether the message is from a group */
  isGroup: boolean
  /** Sender's JID */
  sender: string
  /** If the message is a command (starts with "." or "/") */
  isCommand: boolean
  /** Command name (without prefix) */
  command: string
  /** Arguments after the command */
  args: string[]
  /** Quoted message text, if any */
  quotedText: string | null
  /** Mentioned JIDs */
  mentions: string[]
  /** Whether the bot was mentioned */
  botMentioned: boolean
}

// ── Message Processing Pipeline ───────────────────────────────────────────────

/**
 * Top-level handler for incoming WhatsApp messages.
 *
 * Parses the message, checks if it is a command, and routes it
 * to the command registry. Non-command messages are passed along
 * to feature modules (moderation, games, economy, etc.).
 */
export async function handleIncomingMessage(
  socket: WASocket,
  msg: WAMessage,
): Promise<void> {
  try {
    const parsed = parseMessage(msg)
    if (!parsed) return

    logger.debug(
      { jid: parsed.jid, command: parsed.command, isCommand: parsed.isCommand },
      "Incoming message",
    )

    // ── Command routing ──────────────────────────────────────────────────
    if (parsed.isCommand) {
      const registry = getRegistry()
      const handled = await registry.execute(parsed.command, {
        socket,
        jid: parsed.jid,
        isGroup: parsed.isGroup,
        sender: parsed.sender,
        text: parsed.text,
        command: parsed.command,
        args: parsed.args,
        quoted: msg,
      })

      if (!handled) {
        logger.debug({ command: parsed.command }, "Unknown command")
        // Optionally send a "command not found" reply:
        // await socket.sendMessage(parsed.jid, {
        //   text: `❌ Unknown command "${parsed.command}". Try .help`,
        // })
      }
      return
    }

    // ── Non-command pipeline ─────────────────────────────────────────────
    // Feature modules inspect the message and optionally respond:

    // 1. Moderation — anti-link, anti-spam, anti-flood, etc.
    if (parsed.isGroup) {
      const moderated = await handleModeration(socket, parsed)
      if (moderated) return // message was handled (deleted/warned)
    }

    // 2. Welcome — auto-reply, group rules
    const welcomed = await handleWelcomeMessage(socket, parsed)
    if (welcomed) return
  } catch (error) {
    logger.error({ error, msgId: msg.key.id }, "Error processing message")
  }
}

// ── Parsing ────────────────────────────────────────────────────────────────────

const COMMAND_PREFIXES = [".", "/", "#"]
const SELF_JID = "0" // placeholder; set dynamically if needed

/**
 * Parse a raw WAMessage into a structured ProcessedMessage.
 * Returns null if the message is invalid or should be ignored.
 */
function parseMessage(msg: WAMessage): ProcessedMessage | null {
  const jid = msg.key.remoteJid
  if (!jid) return null
  if (!msg.message) return null

  const msgType = getContentType(msg.message)
  if (!msgType) return null

  // ── Extract text content ───────────────────────────────────────────────
  const text = extractText(msg)
  if (text === null) return null

  // ── Mentions ───────────────────────────────────────────────────────────
  const mentions = extractMentions(msg)
  const botMentioned = mentions.some((m) =>
    m.includes(SELF_JID),
  )

  // ── Quoted message ─────────────────────────────────────────────────────
  const quotedText = extractQuoted(msg)

  // ── Command detection ──────────────────────────────────────────────────
  const { isCommand, command, args } = parseCommand(text)

  return {
    jid,
    text,
    type: msgType,
    isGroup: jid.endsWith("@g.us"),
    sender: msg.key.participant ?? jid,
    isCommand,
    command,
    args,
    quotedText,
    mentions,
    botMentioned,
  }
}

/**
 * Extract text content from a message, supporting multiple content types.
 */
function extractText(msg: WAMessage): string | null {
  const content = msg.message
  if (!content) return null

  // Direct conversation
  if (content.conversation) return content.conversation

  // Extended text
  if (content.extendedTextMessage?.text) {
    return content.extendedTextMessage.text
  }

  // Media captions
  if (content.imageMessage?.caption) return content.imageMessage.caption
  if (content.videoMessage?.caption) return content.videoMessage.caption
  if (content.documentMessage?.caption) return content.documentMessage.caption
  if (content.audioMessage) return "🎵 Audio message"

  // Interactive messages (buttons, list responses)
  if (content.buttonsResponseMessage?.selectedButtonId) {
    return content.buttonsResponseMessage.selectedButtonId
  }
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return content.listResponseMessage.singleSelectReply.selectedRowId
  }

  // Reaction messages — don't process as text
  if (content.reactionMessage) return null

  return null
}

/**
 * Extract mentioned JIDs from a message.
 */
function extractMentions(msg: WAMessage): string[] {
  const mentions: string[] = []

  if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    mentions.push(...msg.message.extendedTextMessage.contextInfo.mentionedJid)
  }

  return mentions
}

/**
 * Extract the text from a quoted/replied-to message.
 */
function extractQuoted(msg: WAMessage): string | null {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quoted) return null

  return (
    quoted.conversation ??
    quoted.extendedTextMessage?.text ??
    quoted.imageMessage?.caption ??
    quoted.videoMessage?.caption ??
    null
  )
}

/**
 * Determine whether text is a command and extract name + args.
 *
 * Commands start with a prefix (., /, or #), followed by a command name,
 * then optional space-separated arguments.
 *
 * Examples:
 *   ".ping"          → { isCommand: true, command: "ping", args: [] }
 *   ".kick @user"    → { isCommand: true, command: "kick", args: ["@user"] }
 *   "/help ping"     → { isCommand: true, command: "help", args: ["ping"] }
 *   "hello"          → { isCommand: false, command: "", args: [] }
 */
function parseCommand(text: string): {
  isCommand: boolean
  command: string
  args: string[]
} {
  const trimmed = text.trim()

  // Check if the text starts with a command prefix
  const prefix = COMMAND_PREFIXES.find((p) => trimmed.startsWith(p))
  if (!prefix) {
    return { isCommand: false, command: "", args: [] }
  }

  // Remove the prefix and split
  const withoutPrefix = trimmed.slice(prefix.length).trim()
  const parts = withoutPrefix.split(/\s+/)
  const command = parts[0]?.toLowerCase() ?? ""
  const args = parts.slice(1)

  if (!command) {
    return { isCommand: false, command: "", args: [] }
  }

  return { isCommand: true, command, args }
}
