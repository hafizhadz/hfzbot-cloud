# HfzBot Cloud

Platform SaaS untuk mengelola bot WhatsApp community dengan fitur moderasi otomatis, AI chat, downloader, tools, dan masih banyak lagi.

```
🌐 https://hfzbotcloud.my.id
📧 demo@hfzbot.cloud / demo1234
```

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + shadcn/ui + Framer Motion |
| **Backend** | Express 5 + TypeScript + Prisma ORM |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Bot Service** | Node.js + TypeScript + @whiskeysockets/baileys |
| **Auth** | JWT + Passport.js + Google OAuth |
| **Email** | Resend |
| **Payment** | QRIS Gateway (qris.hanssoft.web.id) |
| **WebSocket** | ws (realtime bot status) |
| **Infra** | Nginx + PM2 + Let's Encrypt |

---

## Struktur Project

```
hfzbot-cloud/
├── server/              # Express API backend
│   ├── src/
│   │   ├── config/      # Env, database, passport
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/   # Auth, subscription, rate limiter
│   │   ├── routes/      # Express routers
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # JWT, response helpers, errors
│   │   └── validators/  # Zod schemas
│   └── prisma/          # Schema + migrations
├── frontend/            # React Vite SPA
│   └── src/
│       ├── components/  # UI components (shadcn)
│       ├── hooks/       # Auth, data fetching
│       ├── pages/       # Landing, auth, dashboard
│       └── services/    # API service layer
├── bot-service/         # WhatsApp bot (multi-tenant)
│   └── src/
│       ├── commands/    # 40+ bot commands
│       ├── modules/     # Moderation, Welcome
│       └── services/    # Baileys, session manager
├── deploy.sh            # Deploy script
├── ecosystem.config.js  # PM2 config
└── redeploy.sh          # Redeploy script
```

---

## Fitur

### 1. Smart Moderation (Otomatis)
Anti-link, anti-spam, anti-flood, anti-capslock, bad word filter, anti-mention, warning system (3x → auto kick).

### 2. Bot Commands (52 commands)
AI Chat, Games/Quiz, Downloader (IG/FB/TikTok), Tools (cuaca, ssweb, jarak, pajak, BPJS, PLN), Stalker (IG/GitHub), Canvas (brat, blackpink, ephoto), Anime/Movie, Komik, Primbon, Enkripsi, Random, dan lainnya.

### 3. Multi-Session WhatsApp
Setiap user punya session WhatsApp terisolasi. Mendukung QR code dan pairing code.

### 4. Subscription System
7/30/90/365 days dengan limit device berbeda. Integrasi QRIS payment gateway.

### 5. Manajemen Pengguna
Auth email/password + Google OAuth, email OTP, forgot/reset password, profil, pengaturan.

---

## Cara Install

### Prasyarat
- Node.js 22+
- Nginx
- Domain (untuk SSL & Google OAuth)

### Clone & Deploy

```bash
git clone https://github.com/hafizhadz/hfzbot-cloud.git
cd hfzbot-cloud

# Copy environment
cp server/.env.example server/.env
nano server/.env

# Deploy
bash deploy.sh
```

### Manual

```bash
# 1. Install dependencies
cd server && npm install && npx prisma generate && npx tsc && cd ..
cd frontend && npm install && npm run build && cd ..
cd bot-service && npm install && npx tsc && cd ..

# 2. Setup database
cd server && npx prisma db push && npx prisma db seed && cd ..

# 3. Start with PM2
cd server && nohup node dist/index.js > api.log 2>&1 &
cd frontend && nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
cd bot-service && nohup node dist/index.js > bot.log 2>&1 &
```

---

## Environment Variables

### server/.env
```
PORT=8000
NODE_ENV=production
ALLOWED_ORIGINS=https://domainkamu.com
FRONTEND_URL=https://domainkamu.com
JWT_SECRET=generate-random-string
JWT_REFRESH_SECRET=generate-another-string
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://domainkamu.com/api/auth/google/callback
RESEND_API_KEY=re_xxx
EMAIL_FROM=HfzBot Cloud <noreply@domainkamu.com>
PAYMENT_API_KEY=xxxx
PAYMENT_BASE_URL=https://qris.hanssoft.web.id/api
BOT_API_KEY=dev-bot-api-key
```

### bot-service/.env
```
BOT_NAME=HfzBot
HEALTH_PORT=3001
AUTH_DIR=auth_state
BOT_API_KEY=dev-bot-api-key
BACKEND_API_URL=https://domainkamu.com/api
BACKEND_BOT_ID=xxxxx
PROXY_ENABLED=false
PROXY_URL=
```

---

## API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/register | Register akun baru |
| POST | /api/auth/login | Login email/password |
| POST | /api/auth/verify-email | Verifikasi OTP |
| POST | /api/auth/resend-otp | Kirim ulang OTP |
| POST | /api/auth/forgot-password | Lupa password |
| POST | /api/auth/reset-password | Reset password |
| GET | /api/auth/google | Google OAuth |
| GET | /api/auth/me | Profil user |
| POST | /api/auth/logout | Logout |

### Subscription
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/subscription/plans | Daftar plan |
| GET | /api/subscription/current | Langganan aktif |
| POST | /api/subscription/create | Buat langganan |
| POST | /api/subscription/cancel | Batalkan |

### Bot
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/bot | Status bot |
| POST | /api/bot | Buat bot |
| POST | /api/bot/connect | Connect QR |
| POST | /api/bot/pairing | Pairing code |
| POST | /api/bot/disconnect | Disconnect |
| DELETE | /api/bot/session | Hapus session |
| GET | /api/bot/status | Polling status |

### Payments
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/payments/create-charge | Buat pembayaran |
| GET | /api/payments/status/:txId | Cek status |
| GET | /api/payments/history | Riwayat |

---

## Notes

- **WhatsApp Block**: IP VPS/data center diblokir WhatsApp. Solusi: proxy residential atau jalanin bot service di jaringan rumah.
- **Email**: Resend sandbox hanya kirim ke email terdaftar. Verifikasi domain di resend.com untuk production.
- **Google OAuth**: Pastikan redirect URI di Google Cloud Console sesuai domain.
