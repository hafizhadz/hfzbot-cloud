// ── Email Service ─────────────────────────────────────────────────────────
// Transactional emails via Resend. All email sending goes through here.

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "HfzBot Cloud <noreply@hfzbot.cloud>";
const APP_NAME = process.env.APP_NAME ?? "HfzBot Cloud";
const APP_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// ── Templates ─────────────────────────────────────────────────────────────

function verificationEmail(name: string, code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e4e4e7;padding:40px 20px">
<div style="max-width:480px;margin:0 auto;background:#14141a;border-radius:12px;border:1px solid #27272a;padding:32px">
  <h2 style="color:#a855f7;margin:0 0 8px">${APP_NAME}</h2>
  <p style="color:#a1a1aa;margin:0 0 24px">Hello ${name},</p>
  <p style="color:#e4e4e7;margin:0 0 8px">Your verification code is:</p>
  <div style="background:#1a1a22;border-radius:8px;padding:20px;text-align:center;margin:16px 0">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#a855f7;font-family:monospace">${code}</span>
  </div>
  <p style="color:#71717a;font-size:13px;margin:0 0 24px">This code expires in 10 minutes. Do not share this code with anyone.</p>
  <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
  <p style="color:#52525b;font-size:12px;margin:0">If you did not create this account, you can safely ignore this email.</p>
</div>
</body>
</html>`;
}

function passwordResetEmail(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e4e4e7;padding:40px 20px">
<div style="max-width:480px;margin:0 auto;background:#14141a;border-radius:12px;border:1px solid #27272a;padding:32px">
  <h2 style="color:#a855f7;margin:0 0 8px">${APP_NAME}</h2>
  <p style="color:#a1a1aa;margin:0 0 24px">Hello ${name},</p>
  <p style="color:#e4e4e7;margin:0 0 16px">Someone requested a password reset for your account.</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${resetUrl}" style="display:inline-block;background:#a855f7;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
  </div>
  <p style="color:#71717a;font-size:13px;margin:0 0 8px">This link expires in 30 minutes.</p>
  <p style="color:#71717a;font-size:13px;margin:0 0 24px">If you did not request this, you can safely ignore this email.</p>
  <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
  <p style="color:#52525b;font-size:12px;margin:0">${resetUrl}</p>
</div>
</body>
</html>`;
}

function subscriptionEmail(name: string, planName: string, days: number): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e4e4e7;padding:40px 20px">
<div style="max-width:480px;margin:0 auto;background:#14141a;border-radius:12px;border:1px solid #27272a;padding:32px">
  <h2 style="color:#a855f7;margin:0 0 8px">${APP_NAME}</h2>
  <p style="color:#a1a1aa;margin:0 0 24px">Hello ${name},</p>
  <p style="color:#e4e4e7;margin:0 0 16px">Your subscription has been activated.</p>
  <div style="background:#1a1a22;border-radius:8px;padding:16px;margin:16px 0">
    <p style="color:#a855f7;font-size:18px;font-weight:600;margin:0">${planName}</p>
    <p style="color:#71717a;font-size:14px;margin:4px 0 0">${days} days access</p>
  </div>
  <p style="color:#a1a1aa;margin:24px 0 0">You can now connect and manage your WhatsApp bot.</p>
  <div style="text-align:center;margin:24px 0 0">
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#a855f7;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a>
  </div>
</div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function sendVerificationOtp(
  email: string,
  name: string,
  code: string,
): Promise<boolean> {
  return send(email, `Verify your email address`, verificationEmail(name, code));
}

export async function sendPasswordReset(
  email: string,
  name: string,
  token: string,
): Promise<boolean> {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return send(email, `Reset your password`, passwordResetEmail(name, url));
}

export async function sendSubscriptionActivated(
  email: string,
  name: string,
  planName: string,
  days: number,
): Promise<boolean> {
  return send(email, `Subscription Activated`, subscriptionEmail(name, planName, days));
}

// ── Internal ──────────────────────────────────────────────────────────────

async function send(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL] Would send "${subject}" to ${to} (Resend not configured)`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[EMAIL] Failed to send "${subject}" to ${to}:`, error.message);
      return false;
    }

    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Error sending "${subject}":`, err);
    return false;
  }
}
