import { Outlet } from "react-router-dom";

/**
 * Root layout for public auth pages.
 * Minimal shell — just renders the page content with a small footer.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-border/40 border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-muted-foreground text-center text-xs">
            &copy; {new Date().getFullYear()} HfzBot Cloud. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
