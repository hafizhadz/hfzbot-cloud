// ── Application Entry Point ────────────────────────────────────────────────
// Bootstraps the Express server: connects database, starts listening.

import app from "./app.js";
import { env } from "./config/env.js";
import prisma from "./config/database.js";
import { startScheduler } from "./services/scheduler.service.js";

async function bootstrap(): Promise<void> {
  // ── Connect to database (fail fast if unreachable) ────────────────────
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }

  // ── Start background scheduler ────────────────────────────────────────
  startScheduler();

  // ── Start HTTP server ─────────────────────────────────────────────────
  const server = app.listen(env.port, () => {
    console.log(`
  🚀  HfzBot Cloud API Server
  ─────────────────────────────
  Port:  ${env.port}
  Env:   ${env.nodeEnv}
  URL:   http://localhost:${env.port}
  API:   http://localhost:${env.port}/api
    `);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("Server closed");
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
