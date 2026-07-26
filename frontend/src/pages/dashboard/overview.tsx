import { useMemo, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot as BotIcon,
  CreditCard,
  MessageSquare,
  Plug,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/hooks/use-auth";
import { useData } from "@/hooks/use-data";
import { getBot } from "@/services/bot.service";
import { getCurrent } from "@/services/subscription.service";
import type { Bot, Subscription, Activity as ActivityType } from "@/types";

/* ── Helpers ── */

function daysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Stat Card ── */

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  children,
}: {
  title: string;
  value?: string;
  icon: ElementType;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : children ? (
            children
          ) : (
            <div className="text-2xl font-bold">{value ?? "—"}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Subscription Alert Banner ── */

function SubscriptionBanner({
  subscription,
  loading,
}: {
  subscription: Subscription | null;
  loading: boolean;
}) {
  const navigate = useNavigate();
  if (loading || !subscription) return null;

  const remaining = daysRemaining(subscription.expiresAt);
  const isExpired = subscription.status === "EXPIRED" || remaining === 0;
  const isExpiring = remaining > 0 && remaining < 7;

  if (!isExpired && !isExpiring) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${
        isExpired
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5" />
          <div>
            <p className="text-sm font-semibold">
              {isExpired
                ? "Your subscription has expired"
                : `Your subscription expires in ${remaining} day${remaining > 1 ? "s" : ""}`}
            </p>
            <p className="text-xs opacity-80">
              {isExpired
                ? "Your bot has been suspended. Renew now to reactivate."
                : "Renew to keep your bot active without interruption."}
            </p>
          </div>
        </div>
        <Button
          variant={isExpired ? "destructive" : "default"}
          size="sm"
          onClick={() => navigate("/dashboard/subscription")}
        >
          {isExpired ? "Renew Now" : "Upgrade"}
        </Button>
      </div>
    </motion.div>
  );
}

/* ── Quick Actions ── */

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: "Connect Bot", icon: Plug, to: "/dashboard/bot" },
    { label: "View Plans", icon: CreditCard, to: "/dashboard/subscription" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Button key={a.to} variant="outline" size="sm" onClick={() => navigate(a.to)}>
            <a.icon className="mr-1.5 size-4" />
            {a.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

/* ── Activity Feed ── */

function ActivityFeed({ activities, loading }: { activities: ActivityType[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
        <Activity className="mb-2 size-8 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-muted/50"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
            <Activity className="size-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-foreground">{a.description}</p>
            <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  const {
    data: bot,
    isLoading: botLoading,
    refresh: refreshBot,
  } = useData<Bot>(getBot);

  const {
    data: subscription,
    isLoading: subLoading,
    refresh: refreshSub,
  } = useData<Subscription>(getCurrent);

  /* Placeholder activities — in production these come from an API */
  const activities: ActivityType[] = useMemo(() => {
    const items: ActivityType[] = [];
    if (bot?.status) {
      items.push({
        id: 1,
        type: "bot_status",
        description: `Bot is now ${bot.status}`,
        created_at: bot.updatedAt ?? new Date().toISOString(),
      });
    }
    if (subscription?.status) {
      items.push({
        id: 2,
        type: "subscription",
        description: `Subscription ${subscription.status}`,
        created_at: subscription.createdAt ?? new Date().toISOString(),
      });
    }
    return items;
  }, [bot, subscription]);

  
  const remaining = subscription ? daysRemaining(subscription.expiresAt) : 0;
  const botConnected = bot?.status === "ONLINE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.name ?? "User"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            refreshBot();
            refreshSub();
          }}
        >
          <RefreshCw className="mr-1.5 size-4" />
          Refresh
        </Button>
      </div>

      {/* Subscription Alert */}
      <SubscriptionBanner subscription={subscription} loading={subLoading} />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Bot Status */}
        <StatCard title="Bot Status" icon={BotIcon} loading={botLoading}>
          <div className="flex items-center gap-2">
            <div
              className={`size-2.5 rounded-full ${
                botConnected ? "bg-green-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-2xl font-bold capitalize">
              {bot?.status ?? "No Bot"}
            </span>
          </div>
        </StatCard>

        {/* Subscription */}
        <StatCard
          title="Subscription"
          icon={CreditCard}
          loading={subLoading}
        >
          {subscription ? (
            <>
              <div className="text-2xl font-bold">
                {subscription.plan?.name ?? "Active"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant={
                    subscription.status === "ACTIVE"
                      ? "default"
                      : subscription.status === "EXPIRED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {subscription.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {remaining > 0
                    ? `${remaining} day${remaining > 1 ? "s" : ""} left`
                    : "Expired"}
                </span>
              </div>
              {subscription.expiresAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires: {formatDate(subscription.expiresAt)}
                </p>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold">No Plan</div>
          )}
        </StatCard>

        {/* Messages */}
        <StatCard title="Messages Processed" icon={MessageSquare} loading={false}>
          <div className="text-2xl font-bold">—</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lifetime total
          </p>
        </StatCard>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions />
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} loading={botLoading && subLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
