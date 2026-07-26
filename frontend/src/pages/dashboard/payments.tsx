import { useState } from "react";
import {
  Receipt,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useData } from "@/hooks/use-data";
import { getHistory } from "@/services/payment.service";
import type { Payment, PaymentHistoryResponse } from "@/types";

/* ── Helpers ── */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  paid: { variant: "default", icon: CheckCircle2 },
  pending: { variant: "secondary", icon: Clock },
  failed: { variant: "destructive", icon: XCircle },
};

/* ── Copy Transaction ID ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <>
          <CheckCircle2 className="size-3 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3" />
          {text.slice(0, 8)}...
        </>
      )}
    </button>
  );
}

/* ── Main Page ── */

export default function PaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useData<PaymentHistoryResponse>(
    () => getHistory(page),
    [page]
  );

  const payments = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <p className="text-sm text-muted-foreground">
          View all your past transactions.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        ) : payments.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Receipt className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">No Payment History</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              You haven't made any payments yet. Subscribe to a plan to get
              started.
            </p>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: Payment) => {
                  const cfg = statusConfig[payment.status] ?? statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {formatDate(payment.paid_at ?? payment.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.plan_name}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={cfg.variant}
                          className="flex w-fit items-center gap-1"
                        >
                          <StatusIcon className="size-3" />
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CopyButton text={payment.transaction_id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {lastPage}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
