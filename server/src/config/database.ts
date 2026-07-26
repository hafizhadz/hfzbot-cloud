// ── Prisma Client Singleton ─────────────────────────────────────────────────
// Prevents connection exhaustion during hot-reload in development.
// In long-running API processes, Prisma lazily connects on first query.
// Explicitly call $connect() on startup to fail fast if DB is unreachable.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
