import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RootLayout } from "@/components/layout/root-layout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const AuthCallback = lazy(() => import("@/pages/auth-callback"));
const DashboardOverview = lazy(() => import("@/pages/dashboard/overview"));
const DashboardBot = lazy(() => import("@/pages/dashboard/bot"));
const DashboardAnalytics = lazy(() => import("@/pages/dashboard/analytics"));
const DashboardSubscription = lazy(() => import("@/pages/dashboard/subscription"));
const DashboardPayments = lazy(() => import("@/pages/dashboard/payments"));
const DashboardSettings = lazy(() => import("@/pages/dashboard/settings"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<Landing />} />
            <Route element={<RootLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="auth/callback" element={<AuthCallback />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="bot" element={<DashboardBot />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="subscription" element={<DashboardSubscription />} />
                <Route path="payments" element={<DashboardPayments />} />
                <Route path="settings" element={<DashboardSettings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
