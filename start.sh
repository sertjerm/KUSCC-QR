#!/bin/bash
# File: start.sh
# Version: 1.0.0
# Description: รัน KUSCC-QR บนเครื่อง dev — API (.NET) + Client (Vite) พร้อมกัน, Ctrl+C หยุดทั้งคู่
#   ./start.sh 1   API local + Client local (ค่าเริ่มต้น)
#   ./start.sh 2   Client อย่างเดียว

cd "$(dirname "$0")" || exit 1
source ./ports.env
export PORT_API PORT_CLIENT

cleanup() {
    echo ""
    echo "🛑 Stopping KUSCC-QR..."
    pkill -P $$ 2>/dev/null
    exit
}
trap cleanup SIGINT

kill_port() {
    local PID
    PID=$(lsof -ti:"$1" 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "⚠️  Port $1 ถูกใช้โดย PID $PID — กำลังหยุด"
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
}

MODE=${1:-1}

kill_port "$PORT_CLIENT"

if [ "$MODE" = "2" ]; then
    echo "🌐 Client only → http://localhost:$PORT_CLIENT"
    cd Client && VITE_API_PORT=$PORT_API npm run dev
    exit
fi

kill_port "$PORT_API"
echo "📦 Client → http://localhost:$PORT_CLIENT  (log: client.log)"
(cd Client && VITE_API_PORT=$PORT_API npm run dev > ../client.log 2>&1) &

echo "⚙️  API    → http://localhost:$PORT_API/swagger"
cd API/KusccQr.Api && dotnet run --urls "http://0.0.0.0:$PORT_API"
