// ── Auth Controller ────────────────────────────────────────────────────────
// Route handlers for authentication. Each handler validates input via Zod
// (applied as middleware in routes), delegates to auth service, and returns
// consistent JSON responses.

import { Request, Response, NextFunction } from "express";
import passport from "passport";
import prisma from "../config/database.js";
import { success, error } from "../utils/response.js";
import { UnauthorizedError } from "../utils/errors.js";
import * as authService from "../services/auth.service.js";
import * as emailService from "../services/email.service.js";
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RefreshTokenInput,
} from "../validators/auth.validator.js";

// ── Register ───────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = req.body as RegisterInput;

    const result = await authService.registerUser(name, email, password);

    success(res, {
      user: result.user,
      tokens: result.tokens,
      otpSent: result.otpSent,
      message: "Registration successful. Please verify your email.",
      ...(process.env.NODE_ENV === "development" && { otp: result.otpCode }),
    }, 201);
  } catch (err) {
    next(err);
  }
}

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const result = await authService.loginUser(email, password);

    success(res, {
      user: result.user,
      tokens: result.tokens,
      requiresOtp: result.requiresOtp,
      message: result.requiresOtp
        ? "Login successful. Please verify your email."
        : "Login successful.",
    });
  } catch (err) {
    next(err);
  }
}

// ── Verify Email ───────────────────────────────────────────────────────────

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, code } = req.body as VerifyEmailInput;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      error(res, "NOT_FOUND", "User not found", 404);
      return;
    }

    await authService.verifyEmail(user.id, email, code);

    success(res, { message: "Email verified successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
}

// ── Resend OTP ─────────────────────────────────────────────────────────────

export async function resendOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, type } = req.body as ResendOtpInput;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      success(res, {
        message: "If the email is registered, an OTP has been sent.",
      });
      return;
    }

    const otpCode = await authService.generateAndStoreOTP(user.id, type);

    // TODO: Send OTP via email service
    const response: Record<string, unknown> = {
      message: "OTP sent successfully.",
    };
    if (process.env.NODE_ENV === "development") {
      response.otp = otpCode;
    }

    success(res, response);
  } catch (err) {
    next(err);
  }
}

// ── Forgot Password ────────────────────────────────────────────────────────

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as ForgotPasswordInput;

    // Always return success for security (don't reveal if email exists)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const otpCode = await authService.generateAndStoreOTP(
        user.id,
        "password_reset",
      );

      // Send OTP via email
      emailService.sendVerificationOtp(user.email, user.name, otpCode).catch(() => {});
      const response: Record<string, unknown> = {
        message: "If the email is registered, a password reset OTP has been sent.",
      };
      if (process.env.NODE_ENV === "development") {
        response.otp = otpCode;
      }

      success(res, response);
    } else {
      success(res, {
        message: "If the email is registered, a password reset OTP has been sent.",
      });
    }
  } catch (err) {
    next(err);
  }
}

// ── Reset Password ─────────────────────────────────────────────────────────

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, code, newPassword } = req.body as ResetPasswordInput;

    await authService.resetPassword(email, code, newPassword);

    success(res, { message: "Password reset successful. You can now log in." });
  } catch (err) {
    next(err);
  }
}

// ── Refresh Token ──────────────────────────────────────────────────────────

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken: token } = req.body as RefreshTokenInput;

    const tokens = authService.refreshTokens(token);

    success(res, { tokens });
  } catch (err) {
    next(err);
  }
}

// ── Google OAuth ───────────────────────────────────────────────────────────

export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
}

export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  passport.authenticate(
    "google",
    { session: false },
    async (err: Error | null, user: { id: string } | false) => {
      if (err || !user) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      try {
        const tokens = authService.generateTokens(user.id);

        // Redirect to frontend with tokens
        const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
        const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
        redirectUrl.searchParams.set("accessToken", tokens.accessToken);
        redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);

        return res.redirect(redirectUrl.toString());
      } catch (authErr) {
        next(authErr);
      }
    },
  )(req, res, next);
}

// ── Get Current User ───────────────────────────────────────────────────────

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Express 5 types — use type assertion for augmented user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const profile = await authService.getUserProfile(userId);

    success(res, { user: profile });
  } catch (err) {
    next(err);
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // TODO: Implement token blacklisting/invalidation
  // For now, return success — client should discard the tokens
  success(res, { message: "Logged out successfully" });
}
