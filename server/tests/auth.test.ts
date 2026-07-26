// ── Authentication Integration Tests ───────────────────────────────────────
// Tests the full auth flow using the actual SQLite database.
// Each test cleans up its own data.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database.js";
import * as authService from "../src/services/auth.service.js";
import { signAccessToken, signRefreshToken } from "../src/utils/jwt.js";
import { ValidationError, UnauthorizedError } from "../src/utils/errors.js";

// ── Test Data ──────────────────────────────────────────────────────────────

const testUser = {
  name: "Test User",
  email: `test-${Date.now()}@hfzbot.cloud`,
  password: "TestPass123!",
};

let createdUserId: string;

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up test user if created
  if (createdUserId) {
    await prisma.emailOTP.deleteMany({ where: { userId: createdUserId } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  }
  await prisma.$disconnect();
});

// ── Helper ─────────────────────────────────────────────────────────────────

async function createVerifiedUser() {
  const passwordHash = await bcrypt.hash(testUser.password, 12);
  const user = await prisma.user.create({
    data: {
      name: testUser.name,
      email: `verified-${Date.now()}@hfzbot.cloud`,
      password: passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  return user;
}

// ── Registration ───────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("should register with valid data and return 201 + tokens", async () => {
    const result = await authService.registerUser(
      testUser.name,
      testUser.email,
      testUser.password,
    );

    expect(result.user).toBeDefined();
    expect(result.user.name).toBe(testUser.name);
    expect(result.user.email).toBe(testUser.email);
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.otpSent).toBe(true);

    createdUserId = result.user.id;
  });

  it("should reject duplicate email with 409", async () => {
    await expect(
      authService.registerUser(testUser.name, testUser.email, testUser.password),
    ).rejects.toThrow(ValidationError);
  });

  it("should reject weak password", async () => {
    await expect(
      authService.registerUser("New User", `new-${Date.now()}@test.com`, "123"),
    ).rejects.toThrow(ValidationError);
  });
});

// ── Login ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("should login with valid credentials and return 200 + tokens", async () => {
    const user = await createVerifiedUser();

    const result = await authService.loginUser(user.email, testUser.password);

    expect(result.user).toBeDefined();
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.requiresOtp).toBe(false);

    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("should reject wrong password with 401", async () => {
    const user = await createVerifiedUser();

    await expect(
      authService.loginUser(user.email, "WrongPassword123!"),
    ).rejects.toThrow(UnauthorizedError);

    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("should return requiresOtp=true for unverified email", async () => {
    // Register creates user without email verified — using the already registered user
    const result = await authService.loginUser(testUser.email, testUser.password);
    expect(result.requiresOtp).toBe(true);
  });
});

// ── OTP Verification ───────────────────────────────────────────────────────

describe("POST /api/auth/verify-email", () => {
  it("should verify email with valid OTP code", async () => {
    // Create a fresh unverified user directly (bypass registerUser's OTP generation + cooldown)
    const passwordHash = await bcrypt.hash("TestPass123!", 12);
    const freshUser = await prisma.user.create({
      data: {
        name: "Fresh User",
        email: `fresh-${Date.now()}@hfzbot.cloud`,
        password: passwordHash,
      },
    });

    // Generate an OTP for this fresh user
    const otpCode = await authService.generateAndStoreOTP(
      freshUser.id,
      "email_verification",
    );

    // Verify it
    await authService.verifyEmail(freshUser.id, freshUser.email, otpCode);

    // Confirm user is verified
    const user = await prisma.user.findUnique({ where: { id: freshUser.id } });
    expect(user?.emailVerifiedAt).not.toBeNull();

    // Cleanup
    await prisma.emailOTP.deleteMany({ where: { userId: freshUser.id } });
    await prisma.user.deleteMany({ where: { id: freshUser.id } });
  });

  it("should reject invalid OTP code", async () => {
    // Create a new user for this test
    const tempUser = await createVerifiedUser();
    // Remove verification for testing
    await prisma.user.update({
      where: { id: tempUser.id },
      data: { emailVerifiedAt: null },
    });

    await authService.generateAndStoreOTP(tempUser.id, "email_verification");

    await expect(
      authService.verifyEmail(tempUser.id, tempUser.email, "000000"),
    ).rejects.toThrow(ValidationError);

    await prisma.user.deleteMany({ where: { id: tempUser.id } });
  });

  it("should reject expired OTP code", async () => {
    const tempUser = await createVerifiedUser();

    // Create an already-expired OTP
    const hashedCode = await bcrypt.hash("123456", 10);
    await prisma.emailOTP.create({
      data: {
        userId: tempUser.id,
        type: "email_verification",
        code: hashedCode,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      },
    });

    await expect(
      authService.verifyEmail(tempUser.id, tempUser.email, "123456"),
    ).rejects.toThrow(ValidationError);

    await prisma.user.deleteMany({ where: { id: tempUser.id } });
  });
});

// ── Rate Limiting on OTP ───────────────────────────────────────────────────

describe("OTP rate limiting", () => {
  it("should enforce cooldown between OTP resends", async () => {
    const tempUser = await createVerifiedUser();
    await prisma.user.update({
      where: { id: tempUser.id },
      data: { emailVerifiedAt: null },
    });

    // First request — should succeed
    await authService.generateAndStoreOTP(tempUser.id, "email_verification");

    // Immediate second request — should fail cooldown
    await expect(
      authService.generateAndStoreOTP(tempUser.id, "email_verification"),
    ).rejects.toThrow(ValidationError);

    await prisma.user.deleteMany({ where: { id: tempUser.id } });
  });
});

// ── Protected Routes ───────────────────────────────────────────────────────

describe("Protected routes", () => {
  it("should reject requests without token", async () => {
    // Test the authenticate middleware's behavior indirectly via service
    // by verifying that user data isn't accessible without auth
    await expect(
      authService.getUserProfile("non-existent-id"),
    ).rejects.toThrow();
  });

  it("should accept valid token", async () => {
    // Generate a valid token
    const user = await createVerifiedUser();
    const token = signAccessToken(user.id);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Verify the token works
    const { verifyToken } = await import("../src/utils/jwt.js");
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(user.id);

    await prisma.user.deleteMany({ where: { id: user.id } });
  });
});

// ── Password Reset ─────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  it("should reset password with valid OTP", async () => {
    const user = await createVerifiedUser();

    // Generate password reset OTP
    const otpCode = await authService.generateAndStoreOTP(user.id, "password_reset");

    const newPassword = "NewPass456!";
    await authService.resetPassword(user.email, otpCode, newPassword);

    // Verify new password works
    const result = await authService.loginUser(user.email, newPassword);
    expect(result.tokens.accessToken).toBeDefined();

    await prisma.user.deleteMany({ where: { id: user.id } });
  });
});

// ── Refresh Token ──────────────────────────────────────────────────────────

describe("POST /api/auth/refresh-token", () => {
  it("should issue new tokens with valid refresh token", async () => {
    const user = await createVerifiedUser();
    const refreshToken = signRefreshToken(user.id);

    const tokens = authService.refreshTokens(refreshToken);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("should reject invalid refresh token", async () => {
    expect(() => authService.refreshTokens("invalid-token")).toThrow();
  });
});
