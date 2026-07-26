import { useState } from "react";

import { motion } from "framer-motion";
import {
  Bot,
  Calendar,
  QrCode,
  RefreshCw,
  Plug,
  Unplug,
  RotateCcw,
  Smartphone,
  KeyRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useData } from "@/hooks/use-data";
import {
  getBot,
  createBot,
  connectBot,
  disconnectBot,
  getQR,
  resetSession,
  pairingBot,
} from "@/services/bot.service";
import type { Bot as BotType } from "@/types";

/* ── Helpers ── */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  online: { color: "bg-green-500", bg: "bg-green-500/10", label: "Online" },
  offline: {
    color: "bg-muted-foreground",
    bg: "bg-muted/50",
    label: "Offline",
  },
  connecting: {
    color: "bg-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Connecting",
  },
  suspended: { color: "bg-red-500", bg: "bg-red-500/10", label: "Suspended" },
};

/* ── Status Display ── */

function BotStatusDisplay({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.offline;
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 ${cfg.bg}`}
    >
      <div className={`size-3 rounded-full ${cfg.color} animate-pulse`} />
      <span className="text-sm font-semibold">{cfg.label}</span>
    </div>
  );
}

/* ── QR Code Placeholder ── */

function QRDisplay({ qrCode }: { qrCode?: string }) {
  if (qrCode) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-white p-4">
        <img
          src={qrCode}
          alt="WhatsApp QR Code"
          className="size-48 object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8">
      <QrCode className="mb-3 size-16 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        Connect your bot to see the QR code
      </p>
    </div>
  );
}

/* ── Create Bot Dialog ── */

function CreateBotDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createBot(name.trim());
      setOpen(false);
      setName("");
      onCreated();
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Bot className="mr-1.5 size-4" />
        Create Bot
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Your Bot</DialogTitle>
          <DialogDescription>
            Give your WhatsApp bot a name to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="mb-1.5 block text-sm font-medium">Bot Name</label>
          <input
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            placeholder="e.g. My Assistant Bot"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Connect Confirmation Dialog ── */

function ConfirmAction({
  title,
  description,
  action,
  onConfirm,
  variant = "default",
}: {
  title: string;
  description: string;
  action: string;
  onConfirm: () => Promise<void>;
  variant?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {variant === "destructive" ? (
          <Unplug className="mr-1.5 size-4" />
        ) : (
          <Plug className="mr-1.5 size-4" />
        )}
        {action}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── No Bot State ── */

function NoBotState({ onCreated }: { onCreated: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="size-8 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Get Started with Your Bot</h2>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          Create a WhatsApp bot to manage your groups with moderation, games, economy,
          and leveling features.
        </p>
        <CreateBotDialog onCreated={onCreated} />
      </CardContent>
    </Card>
  );
}

/* ── Subscription Gate ── */


/* ── Bot Detail ── */

function BotDetail({
  bot,
  onRefresh,
}: {
  bot: BotType;
  onRefresh: () => void;
}) {
  const [_isConnecting, setIsConnecting] = useState(false);
  const [qrData, setQrData] = useState<string | undefined>(bot.qr_code);
  const [showQR, setShowQR] = useState(false);
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState("");

  const isOnline = bot.status === "ONLINE";
  const isSuspended = bot.status === "SUSPENDED";
  const isConnectingStatus = bot.status === "CONNECTING";

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const result = await connectBot();
      setQrData(result.qr_code ?? result.qr);
      setShowQR(true);
      onRefresh();
    } catch {
      // handled
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectBot();
    setShowQR(false);
    onRefresh();
  }

  async function handleResetSession() {
    const result = await resetSession();
    setQrData(result.qr_code ?? result.qr);
    setShowQR(true);
    onRefresh();
  }

  async function handleRefreshQR() {
    const result = await getQR();
    setQrData(result.qr_code ?? result.qr);
  }

  async function handlePairing() {
    setPairingLoading(true);
    setPairingError("");
    setPairingCode("");
    try {
      const result = await pairingBot(pairingPhone);
      setPairingCode(result.pairingCode ?? result.code ?? result.message ?? "Kode pairing telah dikirim");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Gagal mendapatkan kode pairing";
      setPairingError(msg);
    } finally {
      setPairingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status + Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{bot.name}</CardTitle>
                <CardDescription>
                  Created {formatDate(bot.createdAt)}
                </CardDescription>
              </div>
            </div>
            <BotStatusDisplay status={bot.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Phone</span>
              <div className="flex items-center gap-1.5 text-sm">
                <Smartphone className="size-3.5 text-muted-foreground" />
                {bot.phoneNumber ?? "Not connected"}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Last Connected
              </span>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="size-3.5 text-muted-foreground" />
                {bot.lastConnectedAt ? formatDate(bot.lastConnectedAt) : "Never"}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Groups</span>
              <p className="text-sm font-medium">
                {bot.groupsCount ?? 0} connected
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Messages Processed
              </span>
              <p className="text-sm font-medium">
                {bot.groupsCount ?? 0} groups
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {!isOnline && !isSuspended && (
            <ConfirmAction
              title="Connect Bot"
              description="This will generate a new QR code. Scan it with your WhatsApp to connect."
              action="Connect"
              variant="default"
              onConfirm={handleConnect}
            />
          )}
          {isOnline && (
            <ConfirmAction
              title="Disconnect Bot"
              description="Your bot will go offline. You can reconnect anytime."
              action="Disconnect"
              variant="destructive"
              onConfirm={handleDisconnect}
            />
          )}
          <Button
            variant="outline"
            onClick={handleResetSession}
            disabled={isConnectingStatus}
          >
            <RotateCcw className="mr-1.5 size-4" />
            Reset Session
          </Button>
          {showQR && (
            <Button variant="ghost" onClick={handleRefreshQR}>
              <RefreshCw className="mr-1.5 size-4" />
              Refresh QR
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* QR Code Section */}
      <motion.div
        initial={showQR ? { opacity: 0, height: 0 } : { opacity: 1 }}
        animate={showQR ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
      >
        {showQR && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-4" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Open WhatsApp on your phone, tap Menu or Settings, and select
                "Linked Devices" to scan this code.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <QRDisplay qrCode={qrData} />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Pairing Code */}
      {!isOnline && !isSuspended && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Pairing Code
            </CardTitle>
            <CardDescription>
              Masukkan nomor WhatsApp kamu untuk mendapatkan kode pairing 6 digit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="6281234567890"
                className="flex-1"
                value={pairingPhone}
                onChange={(e) => setPairingPhone(e.target.value)}
              />
              <Button onClick={handlePairing} disabled={pairingLoading || pairingPhone.length < 10}>
                {pairingLoading ? "Memproses..." : "Kirim"}
              </Button>
            </div>
            {pairingCode && (
              <div className="mt-4 rounded-lg bg-muted p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Kode Pairing:</p>
                <p className="text-2xl font-bold tracking-widest text-primary">{pairingCode}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Masukkan kode ini di WhatsApp {'>'} Linked Devices {'>'} Pair a device
                </p>
              </div>
            )}
            {pairingError && (
              <p className="mt-2 text-sm text-destructive">{pairingError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bot Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Bot Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{bot.status}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(bot.createdAt)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Last Connected</span>
              <span className="font-medium">
                {bot.lastConnectedAt ? formatDate(bot.lastConnectedAt) : "Never"}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Bot ID</span>
              <span className="font-medium">#{bot.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Page ── */

export default function DashboardBotPage() {
  const { data: bot, isLoading, refresh } = useData<BotType>(getBot);
  const hasBot = !!bot;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Bot</h1>
        <p className="text-sm text-muted-foreground">
          Manage your WhatsApp bot connection and settings.
        </p>
      </div>

      {!hasBot ? (
        <NoBotState onCreated={refresh} />
      ) : (
        <BotDetail bot={bot} onRefresh={refresh} />
      )}
    </div>
  );
}
