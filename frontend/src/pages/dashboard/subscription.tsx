import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Infinity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getPlans, getCurrent, createSubscription, cancelSubscription } from "@/services/subscription.service";
import type { SubscriptionPlan, Subscription } from "@/types";

/* ── Helpers ── */

function daysRemaining(expiresAt?: string): number {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (isNaN(diff)) return 0;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const planIcons = [Zap, ShieldCheck, Clock, Infinity];

/* ── Plan Card ── */

function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading,
}: {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelect: () => void;
  isLoading: boolean;
}) {
  const idx = plan.durationDays === 7 ? 0 : plan.durationDays === 30 ? 1 : plan.durationDays === 90 ? 2 : 3;
  const Icon = planIcons[idx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.05 }}
    >
      <Card
        className={`relative overflow-hidden transition-all ${
          isCurrentPlan
            ? "border-primary ring-1 ring-primary/30"
            : plan.active
              ? "border-primary/50"
              : ""
        }`}
      >
        {plan.active && !isCurrentPlan && (
          <div className="absolute right-0 top-0">
            <Badge className="rounded-bl-lg rounded-tr-lg rounded-br-none rounded-tl-none">
              Popular
            </Badge>
          </div>
        )}

        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <CardTitle className="text-lg">{plan.name}</CardTitle>
          </div>
          <CardDescription>{""}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <span className="text-3xl font-bold">
              Rp {plan.price.toLocaleString("id-ID")}
            </span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-500" />
              {plan.durationDays} days access
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-500" />
              All features included
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-500" />
              Up to {plan.maxDevices} device{plan.maxDevices > 1 ? "s" : ""}
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-500" />
              Full bot functionality
            </li>
          </ul>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            variant={isCurrentPlan ? "outline" : "default"}
            onClick={onSelect}
            disabled={isCurrentPlan || isLoading}
          >
            {isLoading ? "Processing..." : isCurrentPlan ? "Current Plan" : plan.durationDays === 7 ? "Buy" : "Upgrade"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/* ── Current Subscription Card ── */

function CurrentSubscriptionCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  const remaining = daysRemaining(subscription.expiresAt);
  const isExpired = subscription.status === "EXPIRED" || remaining === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold">
              {subscription.plan?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days Remaining</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">
                {isExpired ? 0 : remaining}
              </p>
              <span className="text-xs text-muted-foreground">
                / {subscription.plan?.durationDays ?? "?"} days
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="text-lg font-semibold">
              {formatDate(subscription.expiresAt)}
            </p>
          </div>
        </div>
        {isExpired && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            Your subscription has expired. Renew to reactivate your bot.
          </div>
        )}
      </CardContent>
      <CardFooter>
        {(subscription.status === "ACTIVE" || subscription.status === "PENDING") && <CancelSubscriptionButton />}
      </CardFooter>
    </Card>
  );
}

/* ── Cancel Subscription ── */

function CancelSubscriptionButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await cancelSubscription();
      setOpen(false);
      window.location.reload();
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        Batalkan Langganan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan Langganan</DialogTitle>
          <DialogDescription>
            Langganan dan bot akan dinonaktifkan. Data kamu tetap disimpan,
            tapi bot berhenti berfungsi. Kamu bisa berlangganan lagi kapan saja.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? "Memproses..." : "Ya, Batalkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */

export default function SubscriptionPage() {
  const { data: plans, isLoading: plansLoading } = useData<SubscriptionPlan[]>(
    getPlans
  );
  const {
    data: current,
    isLoading: subLoading,
    refresh: refreshSub,
  } = useData<Subscription>(getCurrent);

  const [_buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [qrData, setQrData] = useState<{
    qrImage: string;
    amount: number;
    total: number;
    transactionId: string;
    expiredAt: string;
  } | null>(null);

  async function handleSelectPlan(planId: string) {
    setBuying(planId);
    setQrData(null);
    setMessage(null);
    try {
      const result = await createSubscription(planId);
      if (result.qrImage) {
        setQrData({
          qrImage: result.qrImage,
          amount: result.amount,
          total: result.total ?? result.amount,
          transactionId: result.transactionId,
          expiredAt: result.expiredAt ?? "",
        });
        setMessage({ type: "success", text: "QR code generated. Scan to pay." });
      } else {
        setMessage({ type: "success", text: result.message ?? "Subscription created. Complete payment to activate." });
      }
      await refreshSub();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? "Failed to create subscription. Try again.";
      setMessage({ type: "error", text: msg });
    } finally {
      setBuying(null);
    }
  }

  const isLoading = plansLoading || subLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const plansList = Array.isArray(plans) ? plans : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan and billing.
        </p>
      </div>

      {/* Current Subscription */}
      {current && <CurrentSubscriptionCard subscription={current} />}

      {/* Status Message */}
      {message && (
        <div className={`rounded-lg p-4 text-sm ${message.type === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {message.text}
        </div>
      )}

      {/* QR Code Display */}
      {qrData && (
        <Card>
          <CardHeader>
            <CardTitle>Scan QRIS to Pay</CardTitle>
            <CardDescription>
              Amount: Rp {qrData.total.toLocaleString("id-ID")} &middot; Expires: {qrData.expiredAt}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <img src={qrData.qrImage} alt="QRIS Payment" className="h-64 w-64 rounded-lg border" />
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Invoice: {qrData.transactionId}
          </CardFooter>
        </Card>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {current ? "Change Plan" : "Choose a Plan"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plansList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={current?.planId === plan.id}
              onSelect={() => handleSelectPlan(plan.id)}
              isLoading={_buying === plan.id}
            />
          ))}
        </div>
        {plansList.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No plans available.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
