// ── Zod Validation Schemas for Auth ────────────────────────────────────────
// All request body schemas for authentication endpoints.

import { z } from "zod";

// ── Helpers ────────────────────────────────────────────────────────────────

const emailField = z.string().email("Invalid email address").max(255);

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters");

const nameField = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must not exceed 100 characters");

const otpCodeField = z
  .string()
  .length(6, "OTP code must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP code must be numeric");

const otpTypeField = z.enum(["email_verification", "password_reset"], {
  errorMap: () => ({ message: "Type must be email_verification or password_reset" }),
});

// ── Schemas ────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  passwordConfirmation: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  email: emailField,
  code: otpCodeField,
});

export const resendOtpSchema = z.object({
  email: emailField,
  type: otpTypeField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  email: emailField,
  code: otpCodeField,
  newPassword: passwordField,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Inferred types for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
