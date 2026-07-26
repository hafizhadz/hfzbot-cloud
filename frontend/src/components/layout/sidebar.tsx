import { NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  CreditCard,
  Settings,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/dashboard/bot", icon: Bot, label: "My Bot" },
  {
    to: "/dashboard/analytics",
    icon: BarChart3,
    label: "Analytics",
    badge: "Soon",
  },
  { to: "/dashboard/subscription", icon: CreditCard, label: "Subscription" },
  { to: "/dashboard/payments", icon: Receipt, label: "Payments" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

/**
 * Desktop sidebar — visible on lg+ screens.
 */
export function Sidebar() {
  return (
    <aside className="border-border/40 bg-sidebar hidden w-64 flex-col border-r lg:flex">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-border/40 px-6">
        <Link to="/" className="text-primary text-xl font-bold tracking-tight">
          HfzBot<span className="text-secondary">Cloud</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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

      {/* Footer */}
      <div className="border-border/40 border-t px-6 py-4">
        <p className="text-muted-foreground text-xs">HfzBot Cloud v0.1</p>
      </div>
    </aside>
  );
}
