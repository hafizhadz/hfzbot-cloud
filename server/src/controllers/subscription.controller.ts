// ── Subscription Controller ──────────────────────────────────────────────────
// Route handlers for subscription plan listing, creation, and cancellation.

import { Request, Response, NextFunction } from "express";
import { success, error } from "../utils/response.js";
import * as subscriptionService from "../services/subscription.service.js";
import * as paymentService from "../services/payment.service.js";

// ── List Active Plans ────────────────────────────────────────────────────────

/**
 * GET /api/subscription/plans
 * Returns all active subscription plans ordered by duration.
 */
export async function listPlans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plans = await subscriptionService.getActivePlans();
    success(res, { plans });
  } catch (err) {
    next(err);
  }
}

// ── Get Current Subscription ─────────────────────────────────────────────────

/**
 * GET /api/subscription/current
 * Returns the user's current subscription with plan details and days remaining.
 */
export async function getCurrentSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      success(res, { subscription: null, message: "No active subscription" });
      return;
    }

    success(res, { subscription });
  } catch (err) {
    next(err);
  }
}

// ── Create Subscription ──────────────────────────────────────────────────────

/**
 * POST /api/subscription/create
 * Creates a pending subscription and initiates payment.
 * Body: { planId: string }
 */
export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const { planId } = req.body as { planId: string };

    if (!planId) {
      error(res, "VALIDATION_ERROR", "planId is required", 422);
      return;
    }

    // Create pending subscription
    const { subscriptionId } = await subscriptionService.createSubscription(userId, planId);

    // Get plan details for payment
    const plan = await subscriptionService.getPlanById(planId);

    // If plan is free (Rp 0), activate immediately
    let paymentResult: { paymentUrl?: string; transactionId?: string; qrImage?: string; amount?: number; fee?: number; total?: number } = {};
    
    if (plan.price <= 0) {
      await subscriptionService.activateSubscription(subscriptionId);
      success(res, {
        subscriptionId,
        transactionId: null,
        amount: 0,
        planName: plan.name,
        message: "Subscription activated! Welcome to HfzBot Cloud.",
      }, 201);
      return;
    }

    // Initiate payment for paid plans
    try {
      paymentResult = await paymentService.createCharge(
        userId,
        subscriptionId,
        plan.price,
        plan.name,
      );
    } catch {
      // Gateway down — subscription created in PENDING, user can retry payment
    }

    success(res, {
      subscriptionId,
      paymentUrl: paymentResult.paymentUrl ?? null,
      qrImage: paymentResult.qrImage ?? null,
      transactionId: paymentResult.transactionId ?? null,
      amount: plan.price,
      planName: plan.name,
      message: paymentResult.paymentUrl
        ? "QR code generated. Scan to pay."
        : "Subscription created. Payment gateway temporarily unavailable — retry later.",
    }, 201);
  } catch (err) {
    next(err);
  }
}

// ── Cancel Pending Subscription ──────────────────────────────────────────────

/**
 * POST /api/subscription/cancel
 * Cancels the user's pending subscription.
 */
export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    await subscriptionService.cancelSubscription(userId);

    success(res, { message: "Subscription cancelled successfully" });
  } catch (err) {
    next(err);
  }
}
