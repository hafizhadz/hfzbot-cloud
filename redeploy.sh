#!/bin/bash
echo "━━━ Redeploy HfzBot Cloud ━━━━━"
pkill -f "node dist" 2>/dev/null
pkill -f "tsx src/index" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2
cd ~/hfzbot-cloud/server && nohup node dist/index.js > api.log 2>&1 &
cd ~/hfzbot-cloud/bot-service && nohup npx tsx src/index.js > bot.log 2>&1 &
cd ~/hfzbot-cloud/frontend && nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
sleep 3
echo "API:" && curl -s https://hfzbotcloud.my.id/api/health
echo "Done"
