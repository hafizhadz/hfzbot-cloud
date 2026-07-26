// ── Zod Validation Middleware ──────────────────────────────────────────────
// Validates req.body, req.query, or req.params against a Zod schema.
// Throws ZodError which the global error handler catches and formats.

import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * Creates an Express middleware that validates a request property
 * against a Zod schema. On failure, throws a ZodError.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import { validate } from "../middleware/validate.js";
 *
 * const registerSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * router.post("/register", validate(registerSchema), handler);
 * ```
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      // Pass ZodError to the global error handler
      next(result.error);
      return;
    }

    // Replace with parsed (and possibly transformed) data
    req[target] = result.data;
    next();
  };
}
