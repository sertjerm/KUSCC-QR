#!/bin/bash
# File: build_prod.sh
# Version: 1.0.1
# Description: Build production ของ KUSCC-QR แล้ว deploy ผ่าน FTP (ตาม pattern ของ KUSCC-CENTER)
#   https://apps4.coop.ku.ac.th/kuscc-qr/         → redirect ไป /client/ (คง query string ของ SSO)
#   https://apps4.coop.ku.ac.th/kuscc-qr/client/  → React (Vite build)
#   https://apps4.coop.ku.ac.th/kuscc-qr/api/     → ASP.NET Core 8 (IIS application)
#
#   ./build_prod.sh            build + deploy (ต้องกรอก FTP_USER/FTP_PASS ใน .deploy.env)
#   ./build_prod.sh --dry-run  build อย่างเดียว แสดงคำสั่ง upload ที่จะรัน

set -u
cd "$(dirname "$0")" || exit 1

PROJECT_ROOT=$(pwd)
CLIENT_DIR="$PROJECT_ROOT/Client"
API_DIR="$PROJECT_ROOT/API/KusccQr.Api"
OUTPUT_DIR="$PROJECT_ROOT/dist_prod"
DEPLOY_ENV="${DEPLOY_ENV_FILE:-$PROJECT_ROOT/.deploy.env}"
ROOT_CONFIG="$OUTPUT_DIR/web.config"

# path ต้องตรงกับ vite.config.js (base) และ Client/src/utils/apiConfig.js
APP_BASE_PATH="/kuscc-qr/"
CLIENT_BASE_PATH="${APP_BASE_PATH}client/"
PUBLIC_URL="https://apps4.coop.ku.ac.th${APP_BASE_PATH}"

if [ "${1:-}" = "--dry-run" ] || [ "${DEPLOY_DRY_RUN:-}" = "1" ]; then
    DRY_RUN=true
else
    DRY_RUN=false
fi

if [ ! -f "$DEPLOY_ENV" ]; then
    echo "ไม่พบ .deploy.env — สร้างก่อนด้วย: cp .deploy.env.example .deploy.env แล้วกรอกค่าให้ตรงกับ IIS"
    exit 1
fi
# shellcheck disable=SC1090
source "$DEPLOY_ENV"
if [ -z "${FTP_HOST:-}" ] || [ -z "${FTP_PATH_CLIENT:-}" ] || [ -z "${FTP_PATH_API:-}" ]; then
    echo "Error: .deploy.env ไม่ครบ — ต้องกำหนด FTP_HOST, FTP_PATH_CLIENT, FTP_PATH_API"
    exit 1
fi
FTP_PATH_ROOT="${FTP_PATH_ROOT:-$(dirname "$FTP_PATH_CLIENT")}"

echo "=========================================="
echo " Building KUSCC-QR for Production"
echo " $(date '+%d/%m/%Y %H:%M:%S')  →  $PUBLIC_URL"
echo "=========================================="

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/client" "$OUTPUT_DIR/api"

# ------------------------------------------------------------------
# 1. Client
# ------------------------------------------------------------------
echo ""
echo "[1/2] Building Client (base: $CLIENT_BASE_PATH)..."
cd "$CLIENT_DIR" || exit 1
[ -d node_modules ] || npm install
# ไม่ลบ node_modules/.vite — เป็น cache ของ dev server (vite build ไม่ใช้) ลบแล้ว ./start.sh ที่รันอยู่จะหน้าว่าง
rm -rf dist
# ไม่ส่ง VITE_SSO_BYPASS — และ production build ตัดโค้ดโหมดทดสอบทิ้งอยู่แล้ว
if ! env -u VITE_SSO_BYPASS NODE_ENV=production npm run build -- --base="$CLIENT_BASE_PATH"; then
    echo "Error: Client build failed!"
    exit 1
fi
if grep -rq "dev-bypass" dist/assets; then
    echo "Error: พบโค้ดโหมดทดสอบใน production build — ยกเลิก"
    exit 1
fi
cp -r dist/* "$OUTPUT_DIR/client/"

# SPA routing: URL ที่ไม่ใช่ไฟล์จริงให้ตอบ index.html
cat > "$OUTPUT_DIR/client/web.config" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA fallback" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".webp" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>
  </system.webServer>
</configuration>
EOF

# Root: /kuscc-qr/ → /kuscc-qr/client/ (appendQueryString เพื่อไม่ให้ sso_token หาย)
cat > "$ROOT_CONFIG" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Redirect KUSCC-QR root to client" stopProcessing="true">
          <match url="^$" />
          <action type="Redirect" url="${CLIENT_BASE_PATH}" appendQueryString="true" redirectType="Found" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
EOF
echo "Client build successful."

# ------------------------------------------------------------------
# 2. API
# ------------------------------------------------------------------
echo ""
echo "[2/2] Publishing API (Release, framework-dependent .NET 8)..."
cd "$API_DIR" || exit 1
if ! dotnet publish -c Release -o "$OUTPUT_DIR/api"; then
    echo "Error: dotnet publish failed!"
    exit 1
fi
cp "$API_DIR/web.config" "$OUTPUT_DIR/api/web.config"
mkdir -p "$OUTPUT_DIR/api/logs"

MISSING=()
for f in KusccQr.Api.dll web.config appsettings.json; do
    [ -f "$OUTPUT_DIR/api/$f" ] || MISSING+=("$f")
done
if [ ${#MISSING[@]} -gt 0 ]; then
    echo "Error: API build ไม่สมบูรณ์ — ไม่พบ: ${MISSING[*]}"
    exit 1
fi
if [ -f "$OUTPUT_DIR/api/appsettings.Local.json" ]; then
    echo "Error: appsettings.Local.json (มีรหัสผ่าน) หลุดเข้า publish — ยกเลิก"
    exit 1
fi
echo "API build successful."

echo ""
echo "=========================================="
echo " Build Complete → $OUTPUT_DIR"
echo "   client/    → $FTP_HOST$FTP_PATH_CLIENT"
echo "   api/       → $FTP_HOST$FTP_PATH_API"
echo "   web.config → $FTP_HOST$FTP_PATH_ROOT/web.config"
echo "=========================================="

# ------------------------------------------------------------------
# 3. Deploy (FTP)
# ------------------------------------------------------------------
# appsettings.json ไม่มีความลับ จึง upload ได้; appsettings.Local.json (connection string) วางบน server ครั้งแรกด้วยมือ
# และ mirror จะไม่ลบ/ทับ เพราะถูก exclude ไว้
LFTP_SETTINGS='set sftp:auto-confirm yes; set ftp:ssl-allow no; set net:timeout 30'

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "[DRY-RUN] ไม่ upload จริง"
    echo "[DRY-RUN] mirror client      → $FTP_PATH_CLIENT"
    echo "[DRY-RUN] put app_offline    → $FTP_PATH_API/app_offline.htm"
    echo "[DRY-RUN] mirror api         → $FTP_PATH_API (exclude appsettings.Local.json, logs/, app_offline.htm)"
    echo "[DRY-RUN] rm app_offline     → $FTP_PATH_API/app_offline.htm"
    echo "[DRY-RUN] put root web.config → $FTP_PATH_ROOT/web.config"
    exit 0
fi

if [ -z "${FTP_USER:-}" ] || [ -z "${FTP_PASS:-}" ]; then
    echo ".deploy.env ยังไม่ได้กรอก FTP_USER / FTP_PASS — ข้ามขั้นตอน deploy"
    exit 0
fi
if ! command -v lftp >/dev/null; then
    echo "ไม่พบ lftp — ติดตั้งด้วย: brew install lftp"
    exit 1
fi

run_lftp() {
    lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" -e "$LFTP_SETTINGS; $1; bye"
}

echo "Uploading Client..."
run_lftp "mirror -R --delete --verbose \"$OUTPUT_DIR/client\" \"$FTP_PATH_CLIENT\"" || exit 1

# app_offline.htm: ให้ IIS ปิด app pool ชั่วคราว เพื่อปลด lock ของ DLL ก่อนทับ
echo "Putting API offline..."
APP_OFFLINE=$(mktemp)
echo "<html><body>กำลังอัปเดตระบบ KUSCC-QR...</body></html>" > "$APP_OFFLINE"
run_lftp "put \"$APP_OFFLINE\" -o \"$FTP_PATH_API/app_offline.htm\""
rm -f "$APP_OFFLINE"
sleep 3

echo "Uploading API..."
run_lftp "mirror -R --delete --verbose --exclude appsettings.Local.json --exclude logs/ --exclude app_offline.htm \"$OUTPUT_DIR/api\" \"$FTP_PATH_API\""
UPLOAD_EXIT=$?

echo "Bringing API back online..."
run_lftp "rm \"$FTP_PATH_API/app_offline.htm\""
[ $UPLOAD_EXIT -eq 0 ] || { echo "Error: upload API ไม่สำเร็จ"; exit 1; }

echo "Uploading root redirect..."
run_lftp "put \"$ROOT_CONFIG\" -o \"$FTP_PATH_ROOT/web.config\"" || exit 1

echo "-------------------------------------------------------"
echo "Deploy Complete!  $PUBLIC_URL"
echo "-------------------------------------------------------"
