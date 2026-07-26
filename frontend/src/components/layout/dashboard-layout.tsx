import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

/**
 * Dashboard layout for authenticated pages.
 * Responsive: Sheet drawer on mobile, fixed sidebar on desktop.
 */
export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col overflow-y-auto bg-background">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-backdrop-blur:bg-background/60 lg:hidden">
          <MobileNav />
          <span className="text-primary text-base font-bold tracking-tight">
            HfzBot<span className="text-secondary">Cloud</span>
          </span>
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
