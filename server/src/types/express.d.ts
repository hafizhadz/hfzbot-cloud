// ── Express Type Augmentations ─────────────────────────────────────────────
// Augments the Express Request interface with our custom user payload.

import { AuthenticatedUser } from "./index.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request {
      /** Authenticated user payload attached by JWT middleware */
      user?: AuthenticatedUser;
    }
  }
}

export {};
