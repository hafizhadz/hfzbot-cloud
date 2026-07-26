import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type { User } from "@/types";

/* ── Types ── */

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  verifyEmail: (email: string, code: string) => Promise<Record<string, unknown>>;
  resendOtp: (email: string, type: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

/* ── Context ── */

const AuthContext = createContext<AuthContextType | null>(null);

/* ── Storage Keys ── */

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

/* ── Provider ── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const navigate = useNavigate();

  /** Hydrate user from stored token on mount */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        const user = res.data?.user ?? res.data?.data?.user ?? res.data;
        setState({ user, isLoading: false, isAuthenticated: true });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  /** Store tokens and user after successful auth */
  const finalizeAuth = useCallback((user: User, accessToken: string, refreshToken?: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  /** Clear all auth state */
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data?.data ?? res.data;
      if (data.requiresOtp) {
        return false; // caller should redirect to verify-email
      }
      finalizeAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    },
    [finalizeAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const res = await api.post("/auth/register", { name, email, password, passwordConfirmation });
      const data = res.data?.data ?? res.data;
      finalizeAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    },
    [finalizeAuth],
  );

  /** Login with pre-existing tokens (used by OAuth callback) */
  const loginWithTokens = useCallback(
    async (accessToken: string, refreshToken: string) => {
      // Set the access token before calling /auth/me
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      
      const res = await api.get("/auth/me");
      const user = res.data?.data?.user ?? res.data?.user ?? res.data?.data ?? res.data;
      setState({ user, isLoading: false, isAuthenticated: true });
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    navigate("/login");
  }, [clearAuth, navigate]);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const res = await api.post("/auth/verify-email", { email, code });
    const data = res.data?.data ?? res.data;
    return data;
  }, []);

  const resendOtp = useCallback(async (email: string, type: string) => {
    await api.post("/auth/resend-otp", { email, type });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await api.post("/auth/reset-password", { email, code, newPassword });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithTokens,
        logout,
        verifyEmail,
        resendOtp,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ── */

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
