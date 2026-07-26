// ── JWT Authentication Middleware ──────────────────────────────────────────
// Extracts Bearer token from Authorization header, verifies JWT, and
// attaches the decoded user payload to req.user.

import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "../types/index.js";
import { verifyToken } from "../utils/jwt.js";
import { error } from "../utils/response.js";

/**
 * Require a valid JWT access token. Attaches decoded payload to req.user.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    error(res, "UNAUTHORIZED", "Access token required", 401);
    return;
  }

  try {
    const decoded: JwtPayload = verifyToken(token);
    req.user = { userId: decoded.userId };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    error(res, "UNAUTHORIZED", message, 401);
  }
}

/**
 * Optional auth — attaches user if token is present, but does not reject
 * unauthenticated requests.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (token) {
    try {
      const decoded: JwtPayload = verifyToken(token);
      req.user = { userId: decoded.userId };
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next();
}
