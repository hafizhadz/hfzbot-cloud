// ── Welcome Module ───────────────────────────────────────────────────────────
// Welcome messages, goodbye messages, group rules, auto-reply.

import { type WASocket } from "@whiskeysockets/baileys"
import type { ProcessedMessage } from "../services/message-handler.js"
import { fmt } from "../utils/format.js"

// ── Config ───────────────────────────────────────────────────────────────────

interface GroupConfig {
  welcomeEnabled: boolean
  welcomeMessage: string
  goodbyeEnabled: boolean
  goodbyeMessage: string
  rulesEnabled: boolean
  rules: string[]
  autoReplyEnabled: boolean
  autoReplies: Array<{ keyword: string; response: string }>
}

const groupConfigs = new Map<string, GroupConfig>()

const DEFAULT_WELCOME = "Welcome to the group! Please read the rules."
const DEFAULT_GOODBYE = "Goodbye! Thanks for being here."
const DEFAULT_RULES = [
  "1. Be respectful to all members",
  "2. No spam or advertising",
  "3. Follow the admins' instructions",
]

function getConfig(jid: string): GroupConfig {
  if (!groupConfigs.has(jid)) {
    groupConfigs.set(jid, {
      welcomeEnabled: true,
      welcomeMessage: DEFAULT_WELCOME,
      goodbyeEnabled: true,
      goodbyeMessage: DEFAULT_GOODBYE,
      rulesEnabled: true,
      rules: [...DEFAULT_RULES],
      autoReplyEnabled: false,
      autoReplies: [],
    })
  }
  return groupConfigs.get(jid)!
}

// ── Participant Events ───────────────────────────────────────────────────────

export async function handleParticipantJoin(
  socket: WASocket,
  jid: string,
  participants: string[],
): Promise<void> {
  const config = getConfig(jid)
  if (!config.welcomeEnabled) return

  const mentions = participants.map((p) => p as unknown as string)
  const nameTags = participants.map((p) => `@${p.split("@")[0]}`)
  
  const lines = [
    `Selamat datang, ${nameTags.join(", ")}`,
    "",
    "Kamu sekarang bergabung dengan grup ini.",
    "",
    "Member ke-: -",
    "",
    "Silakan baca peraturan grup",
    "dengan command: .rules",
    "",
    "Semoga betah.",
  ]

  await socket.sendMessage(jid, {
    text: fmt("WELCOME", lines.join("\n")),
    mentions,
  })
}

export async function handleParticipantLeave(
  socket: WASocket,
  jid: string,
  participants: string[],
): Promise<void> {
  const config = getConfig(jid)
  if (!config.goodbyeEnabled) return

  const names = participants.map((p) => `@${p.split("@")[0]}`)
  await socket.sendMessage(jid, {
    text: `${config.goodbyeMessage}\n\nGoodbye, ${names.join(", ")}!`,
  })
}

// ── Message Handler (Auto-Reply) ─────────────────────────────────────────────

export async function handleWelcomeMessage(
  socket: WASocket,
  msg: ProcessedMessage,
): Promise<boolean> {
  if (!msg.isGroup) return false
  const config = getConfig(msg.jid)
  if (!config.autoReplyEnabled || config.autoReplies.length === 0) return false

  const lower = msg.text.toLowerCase()

  for (const reply of config.autoReplies) {
    if (lower.includes(reply.keyword.toLowerCase())) {
      await socket.sendMessage(msg.jid, { text: reply.response })
      return true
    }
  }

  // Group rules command
  if (config.rulesEnabled && (lower === ".rules" || lower === "#rules" || lower === "/rules")) {
    const text = config.rules.join("\n")
    await socket.sendMessage(msg.jid, { text: `📋 *Group Rules*\n\n${text}` })
    return true
  }

  return false
}

// ── Config Commands ──────────────────────────────────────────────────────────

export function setWelcomeMessage(jid: string, message: string) {
  const config = getConfig(jid)
  config.welcomeMessage = message
}

export function setGoodbyeMessage(jid: string, message: string) {
  const config = getConfig(jid)
  config.goodbyeMessage = message
}

export function toggleWelcome(jid: string, enabled: boolean) {
  const config = getConfig(jid)
  config.welcomeEnabled = enabled
}

export function toggleGoodbye(jid: string, enabled: boolean) {
  const config = getConfig(jid)
  config.goodbyeEnabled = enabled
}
