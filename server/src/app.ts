// ── Express Application Setup ──────────────────────────────────────────────
// Configures middleware stack in order: security → parsing → rate limiting →
// routes → error handling.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import "./config/passport.js"; // register Google OAuth strategy
import { generalLimiter } from "./middleware/rate-limiter.js";
import { errorHandler } from "./middleware/error-handler.js";
import apiRoutes from "./routes/index.js";

const app = express();

// ── Trust proxy (behind Cloudflare / reverse proxy) ───────────────────────
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600,
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ── General rate limiter ──────────────────────────────────────────────────
app.use(generalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

export default app;
