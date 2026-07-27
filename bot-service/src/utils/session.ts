import path from "path"
import { fileURLToPath } from "url"
import { useMultiFileAuthState } from "@whiskeysockets/baileys"
import type { AuthenticationState } from "@whiskeysockets/baileys"
import { env } from "./env.js"
import { logger } from "./logger.js"

// Absolute root path for auth storage
// Resolves to: /home/ubuntu/hfzbot-cloud/bot-service/auth_state
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const AUTH_ROOT = path.resolve(__dirname, "..", env.AUTH_DIR)

export async function loadAuthState(userId?: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const authDir = userId ? path.join(AUTH_ROOT, userId) : AUTH_ROOT
  logger.info({ authDir, exists: Boolean(authDir) }, "[AUTH] Loading auth state")

  const { state, saveCreds } = await useMultiFileAuthState(authDir)

  const registered = !!(state.creds as { registered?: boolean }).registered
  logger.info({ hasCreds: Object.keys(state.creds).length > 0, registered }, "[AUTH] Auth state loaded")

  return { state, saveCreds }
}
