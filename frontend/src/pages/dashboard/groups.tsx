import { useState, useMemo, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  CheckCircle2,
  MessageSquare,
  Gamepad2,
  Coins,
  Sparkles,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { useData } from "@/hooks/use-data";
import { getGroups } from "@/services/group.service";
import type { Group } from "@/types";

/* ── Helpers ── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFeatureList(settings: Group["settings"]): { label: string; active: boolean }[] {
  if (!settings) return [];

  const features: { label: string; active: boolean; icon: ElementType }[] = [];
  if (settings.anti_link || settings.anti_spam) features.push({ label: "Moderation", active: true, icon: Shield });
  if (settings.games_enabled) features.push({ label: "Games", active: true, icon: Gamepad2 });
  if (settings.economy_enabled) features.push({ label: "Economy", active: true, icon: Coins });
  if (settings.xp_system) features.push({ label: "Levels", active: true, icon: Sparkles });
  if (settings.auto_reply) features.push({ label: "Auto Reply", active: true, icon: MessageSquare });

  return features;
}

/* ── Group Card ── */

function GroupCard({ group }: { group: Group }) {
  const navigate = useNavigate();
  const features = getFeatureList(group.settings);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer transition-all hover:ring-1 hover:ring-primary/30"
        onClick={() => navigate(`/dashboard/groups/${group.id}`)}
      >
        <CardContent className="flex items-start gap-4 pt-4">
          <Avatar className="size-12 shrink-0">
            {group.groupPhoto ? (
              <AvatarImage src={group.groupPhoto} alt={group.groupName} />
            ) : null}
            <AvatarFallback>{getInitials(group.groupName)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{group.groupName}</h3>
              <Badge
                variant={group.isActive ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {group.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {group.memberCount}
              </span>
              <span>
                Joined{" "}
                {new Date(group.joinedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {features.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {features.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                  >
                    <CheckCircle2 className="size-2.5" />
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Empty State ── */

function EmptyState() {
  const navigate = useNavigate();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Users className="size-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">No Groups Connected</h2>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Connect your bot to WhatsApp groups to start managing them with
          moderation, games, economy, and more.
        </p>
        <Button onClick={() => navigate("/dashboard/bot")}>
          Go to Bot Settings
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Main Page ── */

export default function DashboardGroupsPage() {
  const [search, setSearch] = useState("");
  const { data: allGroups, isLoading: loading } = useData<Group[]>(getGroups);

  const displayGroups = useMemo(() => {
    if (!allGroups) return [];
    if (!search.trim()) return allGroups;
    const q = search.toLowerCase();
    return allGroups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(q) ||
        g.groupJid.toLowerCase().includes(q)
    );
  }, [allGroups, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
        <p className="text-sm text-muted-foreground">
          Manage your connected WhatsApp groups.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : displayGroups.length === 0 ? (
        search ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No groups matching "{search}"
            </CardContent>
          </Card>
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      {displayGroups.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {displayGroups.length} group{displayGroups.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
