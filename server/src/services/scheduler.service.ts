// ── Scheduler Service ───────────────────────────────────────────────────────
// Manages periodic background tasks using setInterval:
//   1. Every 5 minutes → expire overdue subscriptions
//   2. Every 1 minute  → expire stale pending payments

import * as subscriptionService from "./subscription.service.js";
import * as paymentService from "./payment.service.js";

const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

let isRunning = false;

/**
 * Start all scheduled background tasks.
 */
export function startScheduler(): void {
  if (isRunning) return;
  isRunning = true;

  // ── Expire overdue subscriptions (every 5 min) ─────────────────────────
  setInterval(async () => {
    try {
      const count = await subscriptionService.checkAndExpireSubscriptions();
      if (count > 0) {
        console.log(`[Scheduler] Expired ${count} subscription(s)`);
      }
    } catch (err) {
      console.error("[Scheduler] Error expiring subscriptions:", err);
    }
  }, FIVE_MINUTES);

  // ── Expire stale pending payments (every 1 min) ────────────────────────
  setInterval(async () => {
    try {
      const count = await paymentService.expireStalePayments();
      if (count > 0) {
        console.log(`[Scheduler] Expired ${count} stale payment(s)`);
      }
    } catch (err) {
      console.error("[Scheduler] Error expiring payments:", err);
    }
  }, ONE_MINUTE);

  console.log("[Scheduler] Background tasks started");
}

/**
 * Stop all scheduled tasks (useful for testing cleanup).
 */
export function stopScheduler(): void {
  isRunning = false;
  console.log("[Scheduler] Background tasks stopped");
}
