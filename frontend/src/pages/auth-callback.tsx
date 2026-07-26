import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * OAuth callback handler — captures tokens from query params after
 * Google OAuth redirect, stores them, fetches user profile, and
 * redirects to dashboard.
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      loginWithTokens(accessToken, refreshToken)
        .then(() => navigate("/dashboard", { replace: true }))
        .catch(() => navigate("/login?error=auth_failed", { replace: true }));
    } else {
      navigate("/login?error=auth_failed", { replace: true });
    }
  }, [searchParams, navigate, loginWithTokens]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
