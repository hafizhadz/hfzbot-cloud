# ── HfzBot Cloud — Deploy Script ──────────────────────────────────────────
# Jalankan di VPS Ubuntu 22.04+
# Usage: bash deploy.sh

set -e

echo "━━━━━ HfzBot Cloud Deploy ━━━━━━━"
echo ""

# ── 1. System dependencies ──
echo "[1/8] Updating system packages..."
sudo apt update -y && sudo apt upgrade -y

echo "[2/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# ── 2. Clone / Pull project ──
PROJECT_DIR="/home/ubuntu/hfzbot-cloud"
if [ -d "$PROJECT_DIR" ]; then
  echo "[3/8] Updating project..."
  cd "$PROJECT_DIR" && git pull
else
  echo "[3/8] Cloning project..."
  git clone <repo-url> "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# ── 3. Setup environment ──
echo "[4/8] Configuring environment..."
if [ ! -f "server/.env" ]; then
  echo ">>> Buat file server/.env dari template di bawah ini"
  echo ">>> Lalu jalankan ulang script"
  cat > server/.env.example << 'EXAMPLE'
PORT=8000
NODE_ENV=production
ALLOWED_ORIGINS=https://domainkamu.com
FRONTEND_URL=https://domainkamu.com
JWT_SECRET=generate-random-32-chars-min
JWT_REFRESH_SECRET=generate-random-32-chars-min
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://domainkamu.com/api/auth/google/callback
RESEND_API_KEY=re_KSfbi41q_CfsiquAc1mVFr32NtHPjL7Ph
EMAIL_FROM=HfzBot Cloud <noreply@domainkamu.com>
APP_NAME=HfzBot Cloud
PAYMENT_API_KEY=HNS_f0be4867ce9f4d54
PAYMENT_BASE_URL=https://qris.hanssoft.web.id/api
PAYMENT_WEBHOOK_SECRET=dev-webhook-secret
PAYMENT_MODE=sandbox
BOT_API_KEY=dev-bot-api-key
SESSION_SECRET=generate-random-secret
EXAMPLE
  echo "cp server/.env.example server/.env"
  echo "nano server/.env"
  exit 1
fi

# ── 4. Install dependencies ──
echo "[5/8] Installing npm dependencies..."
cd "$PROJECT_DIR/server" && npm install
cd "$PROJECT_DIR/bot-service" && npm install
cd "$PROJECT_DIR/frontend" && npm install

# ── 5. Build ──
echo "[6/8] Building all services..."
cd "$PROJECT_DIR/server"
npx prisma generate
npx prisma db push
npx tsc

cd "$PROJECT_DIR/frontend"
npm run build

cd "$PROJECT_DIR/bot-service"
npx tsc

# ── 6. Setup PM2 ──
echo "[7/8] Setting up PM2..."
sudo npm install -g pm2
pm2 delete hfzbot-api hfzbot-bot 2>/dev/null || true
pm2 start "$PROJECT_DIR/server/dist/index.js" --name hfzbot-api
pm2 start "$PROJECT_DIR/bot-service/dist/index.js" --name hfzbot-bot
pm2 save
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ── 7. Setup Nginx ──
echo "[8/8] Configuring Nginx..."
cat > /tmp/hfzbot-cloud << 'NGINX'
server {
    listen 80;
    server_name domainkamu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name domainkamu.com;

    # SSL — ganti dengan certbot atau manual
    ssl_certificate /etc/letsencrypt/live/domainkamu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domainkamu.com/privkey.pem;

    root /home/ubuntu/hfzbot-cloud/frontend/dist;
    index index.html;

    # Frontend (Vite SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
  sudo cp /tmp/hfzbot-cloud /etc/nginx/sites-available/hfzbot-cloud
  sudo ln -sf /etc/nginx/sites-available/hfzbot-cloud /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "━━━━━ Deploy Selesai! ━━━━━━━"
echo "Frontend : https://domainkamu.com"
echo "API      : https://domainkamu.com/api/health"
echo ""
echo "Jangan lupa:"
echo "  - Ganti domainkamu.com dengan domain asli"
echo "  - Setup SSL: sudo certbot --nginx"
echo "  - Isi server/.env dengan benar"
echo "  - Verifikasi domain di Resend"
