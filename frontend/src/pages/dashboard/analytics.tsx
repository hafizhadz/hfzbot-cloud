import { BarChart3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Bot performance and activity metrics.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="size-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Coming Soon</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Detailed analytics and insights about your bot's performance,
            message activity, moderation stats, and user engagement are
            being built and will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
