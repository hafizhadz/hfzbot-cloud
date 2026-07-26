import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItems } from "./sidebar";

/**
 * Mobile navigation drawer — triggers a sheet from the left.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-border/40 flex h-16 flex-row items-center border-b px-6">
          <SheetTitle className="text-primary text-xl font-bold tracking-tight">
            HfzBot<span className="text-secondary">Cloud</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive && !badge && "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <Badge variant="secondary" className="text-[10px] leading-none">
                  {badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
