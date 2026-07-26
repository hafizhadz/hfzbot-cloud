import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

/**
 * Verify Email page — OTP input with resend countdown timer.
 * Receives email from registration state or forces user to re-enter.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendOtp } = useAuth();

  const email = (location.state as { email?: string })?.email || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [success, setSuccess] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Navigate back if no email provided */
  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  /* Countdown timer for resend */
  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      intervalRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCountdown, canResend]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, code);
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid or expired code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendCountdown(45);
    try {
      await resendOtp(email, "email_verification");
    } catch {
      // Silently handle — user can try again
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MailCheck className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-foreground text-2xl font-bold">
              Verify Your Email
            </CardTitle>
            <CardDescription>
              We sent a verification code to{" "}
              <span className="text-foreground font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="rounded-lg bg-green-500/10 px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">
                Email verified successfully! Redirecting to dashboard...
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="otp-code"
                    className="text-foreground block text-center text-sm font-medium"
                  >
                    Enter verification code
                  </label>
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="text-center text-2xl tracking-[0.5em] placeholder:tracking-normal"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || code.length < 6}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>

                <p className="text-muted-foreground text-center text-sm">
                  Didn&apos;t receive the code?{" "}
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-primary font-medium hover:underline"
                    >
                      Resend code
                    </button>
                  ) : (
                    <span className="text-muted-foreground">
                      Resend in {resendCountdown}s
                    </span>
                  )}
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
