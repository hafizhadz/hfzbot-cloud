// ── Moderation Module ─────────────────────────────────────────────────────────
// Anti-link, anti-spam, anti-flood, anti-capslock, bad word filter,
// anti-mention, warning system, mute, kick, ban.

import { type WASocket } from "@whiskeysockets/baileys"
import type { ProcessedMessage } from "../services/message-handler"
import { fmt } from "../utils/format"

// ── Config ───────────────────────────────────────────────────────────────────

const MAX_MESSAGES_PER_SECOND = 3
const MAX_CAPSLOCK_RATIO = 0.6
const MAX_MENTIONS = 5
const WARN_LIMIT = 3

const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek",
  "ngentot", "goblok", "tolol", "bodoh", "jancok",
]

const LINK_PATTERN = /(https?:\/\/|www\.)[^\s]+/gi

// ── State ────────────────────────────────────────────────────────────────────

interface UserState {
  messageCount: number
  lastMessageTime: number
  warns: number
  mutedUntil: number | null
}

const groupState = new Map<string, Map<string, UserState>>()

function getUserState(groupJid: string, sender: string): UserState {
  if (!groupState.has(groupJid)) groupState.set(groupJid, new Map())
  const users = groupState.get(groupJid)!
  if (!users.has(sender)) {
    users.set(sender, { messageCount: 0, lastMessageTime: 0, warns: 0, mutedUntil: null })
  }
  return users.get(sender)!
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCapslock(text: string): boolean {
  if (text.length < 5) return false
  const letters = text.replace(/[^a-zA-Z]/g, "")
  if (letters.length < 5) return false
  const upper = letters.replace(/[a-z]/g, "")
  return upper.length / letters.length > MAX_CAPSLOCK_RATIO
}

function hasLinks(text: string): boolean {
  return LINK_PATTERN.test(text)
}

function hasBadWords(text: string): boolean {
  const lower = text.toLowerCase()
  return BAD_WORDS.some((w) => lower.includes(w))
}

function isFlood(
  state: UserState,
  now: number,
): boolean {
  if (now - state.lastMessageTime > 1000) {
    state.messageCount = 0
  }
  state.lastMessageTime = now
  state.messageCount++
  return state.messageCount > MAX_MESSAGES_PER_SECOND
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function warnUser(socket: WASocket, jid: string, sender: string, reason: string) {
  const state = getUserState(jid, sender)
  state.warns++
  const tag = `@${sender.split("@")[0]}`

  const lines = [
    `Peringatan diberikan kepada ${tag}.`,
    "",
    `Alasan  : ${reason}`,
    `Warning : ${state.warns}/${WARN_LIMIT}`,
    "",
    "3 warning akan menyebabkan",
    "pengguna dikeluarkan dari grup.",
  ]
  
  await socket.sendMessage(jid, {
    text: fmt("WARNING SYSTEM", lines.join("\n")),
    mentions: [sender as unknown as string],
  })

  if (state.warns >= WARN_LIMIT) {
    await socket.groupParticipantsUpdate(jid, [sender], "remove")
    state.warns = 0
  }
}

async function deleteMessage(socket: WASocket, jid: string, msg: ProcessedMessage) {
  try {
    await socket.sendMessage(jid, {
      delete: { remoteJid: jid, id: msg.command, fromMe: false, participant: msg.sender },
    })
  } catch {
    // Can't always delete others' messages
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function handleModeration(
  socket: WASocket,
  msg: ProcessedMessage,
): Promise<boolean> {
  if (!msg.isGroup) return false

  const state = getUserState(msg.jid, msg.sender)
  const now = Date.now()

  // Check mute
  if (state.mutedUntil && now < state.mutedUntil) {
    await deleteMessage(socket, msg.jid, msg)
    return true
  }

  const text = msg.text

  // Anti-flood
  if (isFlood(state, now)) {
    await warnUser(socket, msg.jid, msg.sender, "Flooding")
    await deleteMessage(socket, msg.jid, msg)
    return true
  }

  // Anti-link
  if (hasLinks(text)) {
    const tag = `@${msg.sender.split("@")[0]}`
    const state = getUserState(msg.jid, msg.sender)
    state.warns++
    
    const lines = [
      "Link terdeteksi dan telah dihapus secara otomatis.",
      "",
      `User    : ${tag}`,
      `Warning : ${state.warns}/${WARN_LIMIT}`,
      "",
      "Harap ikuti peraturan grup.",
    ]
    await socket.sendMessage(msg.jid, {
      text: fmt("MODERATION", lines.join("\n")),
      mentions: [msg.sender as unknown as string],
    })
    
    await deleteMessage(socket, msg.jid, msg)
    
    if (state.warns >= WARN_LIMIT) {
      await socket.groupParticipantsUpdate(msg.jid, [msg.sender], "remove")
      state.warns = 0
    }
    return true
  }

  // Bad word filter
  if (hasBadWords(text)) {
    await warnUser(socket, msg.jid, msg.sender, "Inappropriate language")
    await deleteMessage(socket, msg.jid, msg)
    return true
  }

  // Anti-capslock
  if (isCapslock(text)) {
    await warnUser(socket, msg.jid, msg.sender, "Excessive caps")
    await deleteMessage(socket, msg.jid, msg)
    return true
  }

  // Anti-mention spam
  if (msg.mentions.length > MAX_MENTIONS) {
    await warnUser(socket, msg.jid, msg.sender, "Mention spam")
    await deleteMessage(socket, msg.jid, msg)
    return true
  }

  return false
}
