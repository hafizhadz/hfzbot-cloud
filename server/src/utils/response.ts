// ── Standardised JSON Response Helpers ─────────────────────────────────────
// Every API response follows the same envelope:
//   { success: boolean, data?: T, error?: { code, message }, meta?: {...} }

import { Response } from "express";
import { ApiResponse, ApiMeta } from "../types/index.js";

/**
 * Send a success response.
 */
export function success<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta,
): void {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

/**
 * Send an error response.
 */
export function error(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
): void {
  const body: ApiResponse = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(body);
}

/**
 * Send a paginated response.
 */
export function paginated<T>(
  res: Response,
  data: T[],
  meta: ApiMeta,
): void {
  const totalPages = meta.total && meta.limit
    ? Math.ceil(meta.total / meta.limit)
    : undefined;

  success(res, data, 200, { ...meta, totalPages });
}

/**
 * Send a 201 Created response.
 */
export function created<T>(res: Response, data: T): void {
  success(res, data, 201);
}

/**
 * Send a 204 No Content response.
 */
export function noContent(res: Response): void {
  res.status(204).send();
}
