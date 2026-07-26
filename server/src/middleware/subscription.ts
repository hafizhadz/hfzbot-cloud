// ── Subscription Middleware ──────────────────────────────────────────────────
// Guards routes that require an active subscription.
// Attaches the subscription to req if active.

import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.js";
import { error } from "../utils/response.js";

/**
 * Middleware that rejects requests when the user does not have an active
 * subscription. Attaches current subscription to req.subscription on success.
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).user?.userId as string | undefined;
  if (!userId) {
    error(res, "UNAUTHORIZED", "Authentication required", 401);
    return;
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (!subscription) {
      error(res, "FORBIDDEN", "Subscription required to access this feature", 403);
      return;
    }

    // Check if expired
    if (subscription.expiresAt && subscription.expiresAt <= new Date()) {
      error(res, "FORBIDDEN", "Subscription has expired. Please renew.", 403);
      return;
    }

    // Attach subscription to request for downstream handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).subscription = subscription;
    next();
  } catch (err) {
    next(err);
  }
}
