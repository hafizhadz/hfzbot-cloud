import { useMultiFileAuthState } from "@whiskeysockets/baileys"
import type { AuthenticationState } from "@whiskeysockets/baileys"

import { env } from "./env"
import { logger } from "./logger"

/**
 * Loads or initialises the multi-file auth state.
 *
 * Auth files are stored in `bot-service/auth_state/` and persist
 * WhatsApp session credentials across restarts. Without this, the
 * user would need to re-scan the QR code every time the bot starts.
 *
 * @returns The auth state object and a saveCreds callback.
 */
export async function loadAuthState(userId?: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const authDir = userId ? `${env.AUTH_DIR}/${userId}` : env.AUTH_DIR
  logger.info({ authDir }, "Loading auth state")
  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  logger.info({ hasCreds: Object.keys(state.creds).length > 0 }, "Auth state loaded")
  return { state, saveCreds }
}
