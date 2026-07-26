// ── PM2 Ecosystem Config ─────────────────────────────────────────────────────
// Jalankan: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "hfzbot-api",
      script: "server/dist/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/api-error.log",
      out_file: "logs/api-out.log",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: "hfzbot-bot",
      script: "bot-service/dist/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/bot-error.log",
      out_file: "logs/bot-out.log",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
