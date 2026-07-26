// ── Payment Service ─────────────────────────────────────────────────────────
// QRIS payment gateway integration (Hanssoft Gateway).
// Flow: create invoice → show QR → user pays → check status → activate sub.

import prisma from "../config/database.js";
import { env } from "../config/env.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import * as subscriptionService from "./subscription.service.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PaymentResponse {
  paymentUrl: string;
  transactionId: string;
  qrImage?: string;
  amount: number;
  fee: number;
  total: number;
  expiredAt: string;
}

export interface PaymentStatus {
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  paidAt?: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  paidAt: string | null;
  planName: string | null;
  createdAt: string;
}

// ── QRIS Gateway API Calls ──────────────────────────────────────────────────

const API_BASE = env.payment.baseUrl;
const API_KEY = env.payment.apiKey;

interface QRISInvoiceResponse {
  success: boolean;
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  qris_image: string;
  expired_at: string;
}

interface QRISStatusResponse {
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  status: string;
  qris_image: string;
  expired_at: string;
  created_at: string;
}

/**
 * Create a QRIS invoice via the gateway.
 */
async function createQRISInvoice(amount: number): Promise<QRISInvoiceResponse> {
  const url = `${API_BASE}/invoice?apikey=${encodeURIComponent(API_KEY)}&amount=${amount}`;
  const response = await fetch(url);
  const data = await response.json() as (QRISInvoiceResponse & { error?: string });

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `QRIS gateway error: ${response.status}`);
  }

  return data;
}

/**
 * Check QRIS invoice payment status.
 */
async function checkQRISStatus(invoiceId: string): Promise<QRISStatusResponse> {
  const url = `${API_BASE}/invoice/status?apikey=${encodeURIComponent(API_KEY)}&invoice_id=${encodeURIComponent(invoiceId)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`QRIS gateway error: ${response.status} ${text}`);
  }

  return response.json() as Promise<QRISStatusResponse>;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a payment charge for a subscription.
 * Generates a QRIS invoice and returns the QR image + payment details.
 */
export async function createCharge(
  userId: string,
  subscriptionId: string,
  amount: number,
  planName: string,
): Promise<PaymentResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Create QRIS invoice
  const invoice = await createQRISInvoice(amount);

  // Store payment record
  await prisma.payment.create({
    data: {
      userId,
      subscriptionId,
      amount: invoice.amount,
      currency: "IDR",
      gateway: "QRIS",
      gatewayTxId: invoice.invoice_id,
      status: "PENDING",
      metadata: JSON.stringify({
        planName,
        qrImage: invoice.qris_image,
        fee: invoice.fee,
        total: invoice.total,
        expiredAt: invoice.expired_at,
      }),
    },
  });

  return {
    paymentUrl: invoice.qris_image, // QR code image URL
    transactionId: invoice.invoice_id,
    qrImage: invoice.qris_image,
    amount: invoice.amount,
    fee: invoice.fee,
    total: invoice.total,
    expiredAt: invoice.expired_at,
  };
}

/**
 * Handle an incoming webhook from the payment gateway.
 * (QRIS gateway uses polling, not webhooks — this is kept for compatibility)
 */
export async function handleWebhook(
  _payload: unknown,
  _signature: string,
): Promise<{ received: boolean }> {
  // QRIS gateway doesn't send webhooks — payment verification is manual via Telegram
  return { received: true };
}

/**
 * Check the status of a payment by polling the QRIS gateway.
 */
export async function checkStatus(transactionId: string): Promise<PaymentStatus> {
  const payment = await prisma.payment.findFirst({
    where: { gatewayTxId: transactionId },
  });

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  // If already final, return cached
  if (payment.status === "PAID" || payment.status === "FAILED" || payment.status === "EXPIRED") {
    return {
      status: payment.status as PaymentStatus["status"],
      paidAt: payment.paidAt?.toISOString(),
    };
  }

  // Poll QRIS gateway
  try {
    const qrisStatus = await checkQRISStatus(transactionId);
    const isPaid = qrisStatus.status === "paid";

    if (isPaid) {
      // Mark payment as PAID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Activate subscription
      if (payment.subscriptionId) {
        await subscriptionService.activateSubscription(payment.subscriptionId);
      }

      return { status: "PAID", paidAt: new Date().toISOString() };
    }

    return { status: "PENDING" };
  } catch {
    return { status: "PENDING" };
  }
}

/**
 * Get paginated payment history for a user.
 */
export async function getUserPayments(
  userId: string,
  page: number,
  limit: number,
): Promise<{ payments: PaymentHistoryItem[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        subscription: {
          select: { plan: { select: { name: true } } },
        },
      },
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  return {
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      gateway: p.gateway,
      paidAt: p.paidAt?.toISOString() ?? null,
      planName: p.subscription?.plan?.name ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

/**
 * Find stale pending payments (older than 30 minutes) and mark them as expired.
 */
export async function expireStalePayments(): Promise<number> {
  const threshold = new Date(Date.now() - 30 * 60 * 1000);

  const stalePayments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: threshold },
    },
  });

  for (const payment of stalePayments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "EXPIRED" },
    });

    if (payment.subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { id: payment.subscriptionId },
      });
      if (sub && sub.status === "PENDING") {
        await prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "EXPIRED" },
        });
      }
    }
  }

  return stalePayments.length;
}
