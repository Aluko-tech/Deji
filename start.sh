#!/bin/bash
echo "🚀 Starting Deji Platform..."
cd /workspaces/Deji && npm run dev &
sleep 5
cd /workspaces/Deji/deji-nextjs/deji-platform && npm run dev &
sleep 5
gh codespace ports visibility 3000:public 2>/dev/null
gh codespace ports visibility 5000:public 2>/dev/null
echo "✅ All services running!"
wait
