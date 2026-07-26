// ── Payment Controller ───────────────────────────────────────────────────────
// Route handlers for payment operations: create charge, webhook, status check,
// and payment history.

import { Request, Response, NextFunction } from "express";
import { success, error } from "../utils/response.js";
import * as paymentService from "../services/payment.service.js";

// ── Create Payment Charge ────────────────────────────────────────────────────

/**
 * POST /api/payments/create-charge
 * Creates a payment charge for a subscription plan.
 */
export async function createCharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const { planId, planName, amount, subscriptionId } = req.body as {
      planId?: string;
      planName?: string;
      amount?: number;
      subscriptionId?: string;
    };

    if (!subscriptionId || !amount || !planName) {
      error(
        res,
        "VALIDATION_ERROR",
        "subscriptionId, amount, and planName are required",
        422,
      );
      return;
    }

    const result = await paymentService.createCharge(
      userId,
      subscriptionId,
      amount,
      planName,
    );

    success(res, {
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      message: "Payment charge created. Redirect user to paymentUrl.",
    }, 201);
  } catch (err) {
    next(err);
  }
}

// ── Webhook Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/payments/webhook
 * Handles payment gateway callbacks. No JWT auth — relies on signature
 * verification. The signature is expected in the X-Callback-Token header.
 */
export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const signature =
      (req.headers["x-callback-token"] as string) ??
      (req.headers["x-xendit-signature"] as string) ??
      "";

    const result = await paymentService.handleWebhook(req.body, signature);

    success(res, result);
  } catch (err) {
    next(err);
  }
}

// ── Check Payment Status ─────────────────────────────────────────────────────

/**
 * GET /api/payments/status/:txId
 * Poll the status of a payment transaction.
 */
export async function checkStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const txId = req.params.txId as string;

    if (!txId) {
      error(res, "VALIDATION_ERROR", "Transaction ID is required", 422);
      return;
    }

    const status = await paymentService.checkStatus(txId);

    success(res, { transactionId: txId, ...status });
  } catch (err) {
    next(err);
  }
}

// ── Payment History ──────────────────────────────────────────────────────────

/**
 * GET /api/payments/history
 * Returns the user's paginated payment history.
 */
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const result = await paymentService.getUserPayments(userId, page, limit);

    success(res, result.payments, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
}
