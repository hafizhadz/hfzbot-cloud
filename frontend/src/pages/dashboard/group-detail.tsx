import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Save,
  Users,
  Shield,
  MessageCircle,
  Gamepad2,
  Coins,
  Sparkles,
  Reply,
  KeyRound,
  UserCog,
  ChevronLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { getGroup, updateSettings } from "@/services/group.service";
import { useData } from "@/hooks/use-data";
import type {
  Group,
  GroupSettings,
  PermissionLevel,
  AutoReplyPair,
} from "@/types";

/* ── Helpers ── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ── Toggle Row ── */

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium capitalize">{label.replace(/_/g, " ")}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ── Section Card ── */

function SettingsSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ElementType;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

/* ── Tab: Overview ── */

function OverviewTab({ group }: { group: Group }) {
  const s = group.settings;
  if (!s) return <p className="text-sm text-muted-foreground">No settings available.</p>;

  const features = [
    { label: "Moderation", active: s.anti_link || s.anti_spam, icon: Shield },
    { label: "Welcome Messages", active: s.welcome_messages, icon: MessageCircle },
    { label: "Games", active: s.games_enabled, icon: Gamepad2 },
    { label: "Economy", active: s.economy_enabled, icon: Coins },
    { label: "XP / Levels", active: s.xp_system, icon: Sparkles },
    { label: "Auto Reply", active: s.auto_reply, icon: Reply },
  ];

  return (
    <div className="space-y-6">
      {/* Group Info */}
      <Card>
        <CardContent className="flex items-start gap-4 pt-6">
          <Avatar className="size-16">
            {group.groupPhoto ? <AvatarImage src={group.groupPhoto} alt={group.groupName} /> : null}
            <AvatarFallback className="text-lg">{getInitials(group.groupName)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{group.groupName}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {group.memberCount} members
              </span>
              <span>
                Joined{" "}
                {new Date(group.joinedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <Badge variant={group.isActive ? "default" : "secondary"} className="mt-2">
              {group.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.label} className={f.active ? "" : "opacity-50"}>
            <CardContent className="flex items-center gap-3 pt-4">
              <f.icon className={`size-5 ${f.active ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">
                  {f.active ? "Enabled" : "Disabled"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Moderation ── */

function ModerationTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean) => void;
}) {
  const toggles: [string, string][] = [
    ["anti_link", "Block shared links"],
    ["anti_spam", "Detect and remove spam messages"],
    ["anti_flood", "Prevent message flooding"],
    ["anti_capslock", "Block excessive caps"],
    ["bad_word_filter", "Filter offensive language"],
    ["anti_mention", "Block @mention spam"],
    ["warning_system", "Issue warnings before actions"],
    ["mute", "Mute offending users"],
    ["kick", "Kick users from group"],
    ["ban", "Ban users permanently"],
    ["moderation_logs", "Log all moderation actions"],
  ];

  return (
    <SettingsSection title="Moderation Settings" icon={Shield} description="Configure how your bot moderates group activity.">
      {toggles.map(([key, desc]) => (
        <ToggleRow
          key={key}
          label={key}
          description={desc}
          checked={(settings as unknown as Record<string, boolean>)[key] ?? false}
          onCheckedChange={(v) => onChange(key, v)}
        />
      ))}
    </SettingsSection>
  );
}

/* ── Tab: Welcome ── */

function WelcomeTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean | string) => void;
}) {
  return (
    <SettingsSection title="Welcome & Goodbye" icon={MessageCircle} description="Customize welcome and goodbye messages.">
      <ToggleRow
        label="welcome_messages"
        description="Send a message when new members join"
        checked={settings.welcome_messages}
        onCheckedChange={(v) => onChange("welcome_messages", v)}
      />
      {settings.welcome_messages && (
        <div className="pl-4">
          <Label className="text-xs">Welcome Message</Label>
          <Input
            value={settings.welcome_message_text}
            onChange={(e) => onChange("welcome_message_text", e.target.value)}
            placeholder="Welcome to the group!"
            className="mt-1"
          />
        </div>
      )}

      <Separator className="my-2" />

      <ToggleRow
        label="goodbye_messages"
        description="Send a message when members leave"
        checked={settings.goodbye_messages}
        onCheckedChange={(v) => onChange("goodbye_messages", v)}
      />
      {settings.goodbye_messages && (
        <div className="pl-4">
          <Label className="text-xs">Goodbye Message</Label>
          <Input
            value={settings.goodbye_message_text}
            onChange={(e) => onChange("goodbye_message_text", e.target.value)}
            placeholder="Goodbye!"
            className="mt-1"
          />
        </div>
      )}

      <Separator className="my-2" />

      <ToggleRow
        label="group_rules"
        description="Show group rules to new members"
        checked={settings.group_rules}
        onCheckedChange={(v) => onChange("group_rules", v)}
      />
      {settings.group_rules && (
        <div className="pl-4">
          <Label className="text-xs">Group Rules</Label>
          <textarea
            className="mt-1 h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            value={settings.group_rules_text}
            onChange={(e) => onChange("group_rules_text", e.target.value)}
            placeholder="1. Be respectful\n2. No spam"
          />
        </div>
      )}
    </SettingsSection>
  );
}

/* ── Tab: Games ── */

function GamesTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <SettingsSection title="Games Settings" icon={Gamepad2} description="Configure interactive games for your group.">
      <ToggleRow
        label="games_enabled"
        description="Master toggle for all games"
        checked={settings.games_enabled}
        onCheckedChange={(v) => onChange("games_enabled", v)}
      />
      <div className="space-y-2 pl-4">
        {(["quiz", "guessing_games", "rps", "dice", "coin_flip"] as const).map((g) => (
          <ToggleRow
            key={g}
            label={g}
            checked={(settings[g] as boolean) ?? false}
            onCheckedChange={(v) => onChange(g, v)}
          />
        ))}
      </div>
    </SettingsSection>
  );
}

/* ── Tab: Economy ── */

function EconomyTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <SettingsSection title="Economy Settings" icon={Coins} description="Configure the virtual economy system.">
      <ToggleRow
        label="economy_enabled"
        description="Master toggle for economy"
        checked={settings.economy_enabled}
        onCheckedChange={(v) => onChange("economy_enabled", v)}
      />
      <div className="space-y-2 pl-4">
        {(["daily_reward", "work", "transfer", "shop"] as const).map((e) => (
          <ToggleRow
            key={e}
            label={e}
            checked={(settings[e] as boolean) ?? false}
            onCheckedChange={(v) => onChange(e, v)}
          />
        ))}
      </div>
    </SettingsSection>
  );
}

/* ── Tab: Levels ── */

function LevelsTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <SettingsSection title="Levels & XP" icon={Sparkles} description="Configure the XP and leveling system.">
      <ToggleRow
        label="xp_system"
        description="Enable XP gain from messages"
        checked={settings.xp_system}
        onCheckedChange={(v) => onChange("xp_system", v)}
      />
      <div className="space-y-2 pl-4">
        <ToggleRow
          label="level_up_messages"
          checked={settings.level_up_messages}
          onCheckedChange={(v) => onChange("level_up_messages", v)}
        />
        <ToggleRow
          label="leaderboard"
          checked={settings.leaderboard}
          onCheckedChange={(v) => onChange("leaderboard", v)}
        />
      </div>
    </SettingsSection>
  );
}

/* ── Tab: Auto Reply ── */

function AutoReplyTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: boolean | AutoReplyPair[]) => void;
}) {
  const pairs = settings.auto_replies ?? [];

  function updatePair(index: number, field: keyof AutoReplyPair, value: string) {
    const updated = [...pairs];
    updated[index] = { ...updated[index], [field]: value };
    onChange("auto_replies", updated);
  }

  function addPair() {
    onChange("auto_replies", [...pairs, { keyword: "", response: "" }]);
  }

  function removePair(index: number) {
    onChange(
      "auto_replies",
      pairs.filter((_, i) => i !== index)
    );
  }

  return (
    <SettingsSection title="Auto Reply" icon={Reply} description="Configure automatic keyword-based responses.">
      <ToggleRow
        label="auto_reply"
        description="Master toggle for auto-reply"
        checked={settings.auto_reply}
        onCheckedChange={(v) => onChange("auto_reply", v)}
      />

      {settings.auto_reply && (
        <div className="space-y-3 pt-2">
          {pairs.map((pair, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-border/40 p-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Keyword"
                  value={pair.keyword}
                  onChange={(e) => updatePair(i, "keyword", e.target.value)}
                />
                <Input
                  placeholder="Response"
                  value={pair.response}
                  onChange={(e) => updatePair(i, "response", e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removePair(i)} className="shrink-0">
                <XCircle className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPair}>
            Add Keyword
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

/* ── Tab: Permissions ── */

function PermissionsTab({
  settings,
  onChange,
}: {
  settings: GroupSettings;
  onChange: (key: string, value: PermissionLevel) => void;
}) {
  const defaultCommands = [
    "moderation",
    "warn",
    "mute",
    "kick",
    "ban",
    "games",
    "quiz",
    "economy",
    "daily",
    "transfer",
    "shop",
    "level",
    "leaderboard",
    "auto_reply",
    "settings",
    "owners",
  ];

  const perms = settings.permissions ?? {};

  return (
    <SettingsSection title="Command Permissions" icon={KeyRound} description="Set who can use each command.">
      <p className="text-xs text-muted-foreground">
        Levels: Everyone &gt; Admin &gt; Owner &gt; Disabled
      </p>
      <div className="mt-3 space-y-2">
        {defaultCommands.map((cmd) => (
          <div
            key={cmd}
            className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2.5"
          >
            <span className="text-sm font-medium capitalize">{cmd.replace(/_/g, " ")}</span>
            <Select
              value={perms[cmd] ?? "everyone"}
              onValueChange={(value: unknown) => onChange(cmd, value as PermissionLevel)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

/* ── Tab: Owners ── */

function OwnersTab({
  settings,
}: {
  settings: GroupSettings;
}) {
  const owners = settings.owners ?? [];

  return (
    <SettingsSection title="Group Owners" icon={UserCog} description="Manage group owners and their roles.">
      {owners.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No owners configured</p>
      ) : (
        <div className="space-y-2">
          {owners.map((owner) => (
            <div
              key={owner.id}
              className="flex items-center gap-3 rounded-lg border border-border/40 px-4 py-3"
            >
              <Avatar className="size-9">
                <AvatarFallback>{getInitials(owner.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{owner.name}</p>
                <p className="text-xs text-muted-foreground">{owner.phone ?? "—"}</p>
              </div>
              <Badge variant={owner.is_primary ? "default" : "secondary"}>
                {owner.is_primary ? "Primary Owner" : "Co-Owner"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

/* ── Main Page ── */

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  const { data: group, isLoading, refresh: _refresh } = useData<Group>(
    () => getGroup(id!),
    [id]
  );

  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (group?.settings) {
      setSettings({ ...group.settings });
    }
  }, [group]);

  const handleToggle = useCallback(
    (key: string, value: boolean | string | AutoReplyPair[]) => {
      if (!settings) return;
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [settings]
  );

  const handlePermissionChange = useCallback(
    (cmd: string, level: PermissionLevel) => {
      if (!settings) return;
      setSettings({
        ...settings,
        permissions: { ...settings.permissions, [cmd]: level },
      });
    },
    [settings]
  );

  async function handleSave() {
    if (!id || !settings) return;
    setSaving(true);
    try {
      await updateSettings(id, settings as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  function setTab(tab: string) {
    setSearchParams({ tab });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-lg font-medium">Group not found</p>
        <Button variant="link" className="mt-2" onClick={() => navigate("/dashboard/groups")}>
          Back to Groups
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "moderation", label: "Moderation", icon: Shield },
    { id: "welcome", label: "Welcome", icon: MessageCircle },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "economy", label: "Economy", icon: Coins },
    { id: "levels", label: "Levels", icon: Sparkles },
    { id: "auto-reply", label: "Auto Reply", icon: Reply },
    { id: "permissions", label: "Permissions", icon: KeyRound },
    { id: "owners", label: "Owners", icon: UserCog },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/groups")}>
            <ChevronLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{group.groupName}</h1>
            <p className="text-sm text-muted-foreground">
              Group settings and configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <CheckCircle2 className="size-3.5" />
              Saved
            </span>
          )}
          {activeTab !== "overview" && activeTab !== "owners" && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 size-3.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              <t.icon className="size-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab group={group} />
        </TabsContent>

        <TabsContent value="moderation">
          {settings && (
            <ModerationTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="welcome">
          {settings && (
            <WelcomeTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="games">
          {settings && (
            <GamesTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="economy">
          {settings && (
            <EconomyTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="levels">
          {settings && (
            <LevelsTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="auto-reply">
          {settings && (
            <AutoReplyTab settings={settings} onChange={handleToggle} />
          )}
        </TabsContent>

        <TabsContent value="permissions">
          {settings && (
            <PermissionsTab
              settings={settings}
              onChange={handlePermissionChange}
            />
          )}
        </TabsContent>

        <TabsContent value="owners">
          {settings && <OwnersTab settings={settings} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
