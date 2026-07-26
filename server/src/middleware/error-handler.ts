// ── Global Error Handler Middleware ────────────────────────────────────────
// Must have 4 parameters — Express identifies it as an error handler.
// Catches AppError subclasses and unexpected errors, returning consistent
// JSON error responses.

import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { error } from "../utils/response.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Log the error ──────────────────────────────────────────────────────
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  if (!env.isProduction) {
    console.error(err.stack);
  }

  // ── Known application errors ───────────────────────────────────────────
  if (err instanceof AppError) {
    error(res, err.code, err.message, err.statusCode);
    return;
  }

  // ── Prisma known errors ────────────────────────────────────────────────
  if (err.constructor?.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as Record<string, unknown>;
    // P2002 = unique constraint violation
    if (prismaErr.code === "P2002") {
      error(res, "CONFLICT", "Resource already exists", 409);
      return;
    }
    // P2025 = record not found
    if (prismaErr.code === "P2025") {
      error(res, "NOT_FOUND", "Resource not found", 404);
      return;
    }
  }

  // ── Zod validation errors ──────────────────────────────────────────────
  if (err.constructor?.name === "ZodError") {
    const zodErr = err as unknown as Record<string, unknown>;
    const details = Array.isArray(zodErr.issues)
      ? (zodErr.issues as Array<{ path: string[]; message: string }>)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
      : "Validation failed";

    error(res, "VALIDATION_ERROR", details, 422);
    return;
  }

  // ── SyntaxError from express.json() (malformed JSON body) ─────────────
  if (err instanceof SyntaxError && "body" in err) {
    error(res, "BAD_REQUEST", "Malformed JSON body", 400);
    return;
  }

  // ── Unexpected errors — hide details in production ─────────────────────
  error(
    res,
    "INTERNAL_ERROR",
    env.isProduction ? "Internal server error" : err.message,
    500,
  );
}
