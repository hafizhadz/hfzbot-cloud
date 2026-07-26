// ── Auth Service ───────────────────────────────────────────────────────────
// Business logic for authentication — registration, login, OTP management,
// password handling, and token management.

import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/database.js";
import { signTokenPair, verifyRefreshToken } from "../utils/jwt.js";
import { TokenPair } from "../types/index.js";
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import * as emailService from "./email.service.js";

const SALT_ROUNDS = 12;
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_WINDOW_MINUTES = 10;

// ── Password Hashing ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, "utf-8") > 72) {
    throw new ValidationError("Password exceeds 72-byte limit");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  inputPassword: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(inputPassword, storedHash);
}

// ── Token Generation ───────────────────────────────────────────────────────

export function generateTokens(userId: string): TokenPair {
  return signTokenPair(userId);
}

export function refreshTokens(refreshToken: string): TokenPair {
  const decoded = verifyRefreshToken(refreshToken);
  return signTokenPair(decoded.userId);
}

// ── Registration ───────────────────────────────────────────────────────────

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{
  user: { id: string; name: string; email: string };
  tokens: TokenPair;
  otpSent: boolean;
  otpCode: string; // exposed in dev mode only
}> {
  // Validate password strength
  if (!password || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  if (password.length > 128) {
    throw new ValidationError("Password must not exceed 128 characters");
  }

  // Check for existing user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ValidationError("Email already registered");
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
    },
  });

  // Generate email verification OTP
  const otpCode = await generateAndStoreOTP(user.id, "email_verification");

  // Send OTP via email
  emailService.sendVerificationOtp(email, name, otpCode).catch(() => {});

  const tokens = generateTokens(user.id);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    tokens,
    otpSent: true,
    otpCode,
  };
}

// ── Login ──────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
): Promise<{
  user: { id: string; name: string; email: string; avatar: string | null; emailVerifiedAt: Date | null };
  tokens: TokenPair;
  requiresOtp: boolean;
}> {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.password) {
    // User doesn't exist or uses Google OAuth only
    throw new UnauthorizedError("Invalid email or password");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Check if user is suspended
  if (user.status === "SUSPENDED") {
    throw new ForbiddenError("Account has been suspended");
  }

  // Check email verification
  const requiresOtp = !user.emailVerifiedAt;

  const tokens = generateTokens(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    tokens,
    requiresOtp,
  };
}

// ── OTP Management ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-random numeric OTP code, hash it, store in DB.
 * Returns the raw OTP code (for the caller to send via email/SMS).
 */
export async function generateAndStoreOTP(
  userId: string,
  type: string,
): Promise<string> {
  // Check resend cooldown
  const recentOtp = await prisma.emailOTP.findFirst({
    where: {
      userId,
      type,
      createdAt: {
        gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentOtp) {
    const secondsSinceLastOtp = Math.floor(
      (Date.now() - recentOtp.createdAt.getTime()) / 1000,
    );
    const remainingCooldown = OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp;
    if (remainingCooldown > 0) {
      throw new ValidationError(
        `Please wait ${remainingCooldown} seconds before requesting a new OTP`,
      );
    }
  }

  // Check rate limit: max N OTP requests per window
  const windowStart = new Date(
    Date.now() - OTP_WINDOW_MINUTES * 60 * 1000,
  );
  const recentOtpsCount = await prisma.emailOTP.count({
    where: {
      userId,
      type,
      createdAt: { gte: windowStart },
    },
  });

  if (recentOtpsCount >= OTP_MAX_REQUESTS_PER_WINDOW) {
    throw new ValidationError(
      "Too many OTP requests. Please try again later.",
    );
  }

  // Generate random 6-digit code
  const otpCode = crypto.randomInt(100000, 999999).toString();

  // Hash the code for storage
  const hashedCode = await bcrypt.hash(otpCode, 10);

  // Store in database
  await prisma.emailOTP.create({
    data: {
      userId,
      type,
      code: hashedCode,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  return otpCode;
}

/**
 * Verify an OTP code for a given user and type.
 * Checks hash match, expiry, and attempt limits.
 */
export async function verifyOTP(
  userId: string,
  email: string,
  code: string,
  type: string,
): Promise<{ valid: boolean; otpId?: string }> {
  // Verify the email matches the user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== email) {
    throw new ValidationError("Invalid verification request");
  }

  // Find the most recent unexpired OTP of this type
  const otp = await prisma.emailOTP.findFirst({
    where: {
      userId,
      type,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new ValidationError("No valid OTP found. Please request a new one.");
  }

  // Check attempt limit
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ValidationError("Too many failed attempts. Please request a new OTP.");
  }

  // Verify the code against the hash
  const isValid = await bcrypt.compare(code, otp.code);

  if (!isValid) {
    // Increment attempts
    await prisma.emailOTP.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    if (remaining <= 0) {
      throw new ValidationError("Too many failed attempts. Please request a new OTP.");
    }
    throw new ValidationError(`Invalid OTP code. ${remaining} attempt(s) remaining.`);
  }

  return { valid: true, otpId: otp.id };
}

/**
 * Verify email address using OTP code.
 */
export async function verifyEmail(
  userId: string,
  email: string,
  code: string,
): Promise<void> {
  const result = await verifyOTP(userId, email, code, "email_verification");

  // Mark email as verified
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  // Clean up used OTP
  if (result.otpId) {
    await prisma.emailOTP.delete({ where: { id: result.otpId } });
  }
}

// ── Password Reset ─────────────────────────────────────────────────────────

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success for security (don't reveal if email exists)
    return;
  }

  // Verify the OTP
  const result = await verifyOTP(user.id, email, code, "password_reset");

  // Hash and update password
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  });

  // Clean up used OTP
  if (result.otpId) {
    await prisma.emailOTP.delete({ where: { id: result.otpId } });
  }
}

/**
 * Change password (requires old password verification).
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) {
    throw new NotFoundError("User not found");
  }

  // Verify old password
  const isValid = await verifyPassword(oldPassword, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  // Hash and update
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  });
}

// ── Google OAuth ───────────────────────────────────────────────────────────

interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

/**
 * Find or create a user from Google profile data.
 */
export async function findOrCreateGoogleUser(
  profile: GoogleProfile,
): Promise<{
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isNew: boolean;
}> {
  // Try to find by googleId first, then by email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.id }, { email: profile.email }],
    },
  });

  const isNew = !user;

  if (user) {
    // Update Google info if not already set
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          avatar: profile.avatar ?? user.avatar,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }
  } else {
    // Create new user from Google profile
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.id,
        avatar: profile.avatar,
        emailVerifiedAt: new Date(), // Google-verified emails are trusted
      },
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isNew,
  };
}

// ── User Profile ───────────────────────────────────────────────────────────

/**
 * Get user profile by ID (for /me endpoint).
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      emailVerifiedAt: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}
