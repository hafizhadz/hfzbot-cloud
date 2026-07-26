// ── Authentication Routes ──────────────────────────────────────────────────
// All auth-related endpoints mounted under /api/auth.

import { Router } from "express";
import { authLimiter } from "../middleware/rate-limiter.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as authController from "../controllers/auth.controller.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Apply strict rate limiting to all auth routes
router.use(authLimiter);

// ── Email/Password Auth ────────────────────────────────────────────────────
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

// ── Email Verification ─────────────────────────────────────────────────────
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);

// ── Password Reset ─────────────────────────────────────────────────────────
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// ── Token Management ───────────────────────────────────────────────────────
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);

// ── Google OAuth ───────────────────────────────────────────────────────────
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// ── Protected Routes ───────────────────────────────────────────────────────
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

export default router;
