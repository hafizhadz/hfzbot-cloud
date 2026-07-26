// ── Shared TypeScript Types ─────────────────────────────────────────────────

import { Request } from "express";

// ── JWT ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AuthenticatedRequestWithSubscription extends AuthenticatedRequest {
  subscription: {
    id: string;
    userId: string;
    planId: string;
    startedAt: Date | null;
    expiresAt: Date | null;
    status: string;
    plan: { name: string; durationDays: number };
  };
}

// ── API Response Envelope ──────────────────────────────────────────────────

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

// ── Enums (mirrors Prisma) ─────────────────────────────────────────────────

export type UserStatus = "ACTIVE" | "SUSPENDED";

export type SubscriptionStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
