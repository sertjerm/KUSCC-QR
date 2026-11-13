# KUSCC-QR — Claude Code Instructions

> กฎร่วมทั้งหมด (ภาษาไทย, naming, git, architecture, UI) อยู่ที่ `~/Dev/NetCore/CLAUDE.md` — Claude Code อ่านอัตโนมัติ
> **สัญญา API อยู่ที่ [`docs/API_SPEC.md`](docs/API_SPEC.md)** — แก้ endpoint/DTO ต้องแก้ spec ในการเปลี่ยนแปลงเดียวกันเสมอ
> โปรเจกต์นี้ทำงานร่วมกับ Codex (อ่าน `AGENTS.md`) — ทั้งสองฝั่งยึด `docs/API_SPEC.md` เป็นหลัก

## โปรเจกต์
**KUSCC QR Studio** — เครื่องมือสร้าง QR Code แบบตกแต่งได้ (สไตล์ Canva) สำหรับใช้งานในองค์กร
สร้างและ render QR **ฝั่ง browser ทั้งหมด** ด้วย [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling)
Backend ทำหน้าที่เก็บ QR ที่บันทึก, brand preset และ lookups เท่านั้น

| | |
|---|---|
| Repo | `https://github.com/sertjerm/KUSCC-QR.git` |
| SSO App ID | `KUSCC-QR` (ต้องให้ผู้ดูแล SSO เพิ่ม host ใน `App:AllowedReturnUrlHosts`) |
| Database | MSSQL — ตาราง `dbo.kuscc_qr_codes`, `dbo.kuscc_qr_brand_presets` (`docs/db/001_create_tables.sql`) |
| Port (dev) | API `5250`, Client `5251` — กำหนดที่ `ports.env` ที่เดียว |
| Production | Client `https://apps4.coop.ku.ac.th/kuscc-qr/client/` · API `https://apps4.coop.ku.ac.th/kuscc-qr/api` |

## Dev Commands

```bash
./start.sh        # API :5250 + Vite :5251 (log client → client.log)
./start.sh 2      # Client อย่างเดียว

cd API && dotnet build
cd Client && npm run dev
cd Client && npm run build && npm run lint
```

Connection string ใส่ที่ `API/KusccQr.Api/appsettings.Local.json` (gitignored):
```json
{ "ConnectionStrings": { "DefaultConnection": "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True" } }
```

## โครงสร้าง

```
API/KusccQr.Api/
  Program.cs                       — DI, SSO auth (fail closed), CORS, camelCase JSON, ApiResponse สำหรับ 400
  Common/DTOs/ApiResponse.cs       — ApiResponse<T>, PagedResult<T>
  Infrastructure/
    Auth/SsoAuthenticationHandler  — verify token กับ SSO + cache (Sso:VerifyCacheSeconds)
    Auth/CurrentUser               — User.GetMemberCode() (เติม 0 ครบ 6 หลัก)
    Data/DbConnectionFactory       — SqlConnection จาก DefaultConnection
  Modules/
    QrCodes/      Controllers / Services / Repositories / Interfaces / DTOs — CRUD ของเจ้าของเท่านั้น
    BrandPresets/ BrandPresetModule.cs (read-only)
    Lookups/      LookupModule.cs — ตัวเลือก dropdown ทั้งหมด (ไม่ใช้ DB)

Client/src/
  api/qrApi.js                     — ฟังก์ชันเรียก API ทุกตัว (คืน data ของ ApiResponse)
  utils/apiConfig.js | apiClient.js | auth.js
  routes/ AppRoutes, ProtectedRoute (รับ callback SSO + ตรวจ exp + refresh)
  layouts/MainLayout.jsx
  modules/designer/
    pages/DesignerPage.jsx         — /designer, /designer/:id
    components/ QrPreview, ContentForm, StylePanel, ExportPanel
    utils/qrContent.js             — data → content ตาม qrType (vCard, Wi-Fi escape ฯลฯ)
    utils/qrStyle.js               — DEFAULT_STYLE, toStylingOptions, contrast warning
  modules/library/pages/MyQrPage.jsx — /my-qr
```

## กฎเฉพาะ project นี้

- **Dropdown มาจาก `GET /lookups`** — เพิ่มตัวเลือกใหม่ที่ `LookupModule.cs` ไม่ใช่ใน JSX
  (ข้อยกเว้นเดียว: ขนาด export px ใน `ExportPanel.jsx` เป็นค่าทางเทคนิค)
- `style` ที่บันทึก = options ของ qr-code-styling **ไม่รวม** `data/width/height/type` — ห้ามเปลี่ยนโครงโดยไม่แก้ spec ข้อ 4
- `margin` เก็บเทียบภาพ 600px (`PREVIEW_SIZE`) แล้วขยายตามขนาด export
- มีโลโก้ → ตั้ง error correction เป็น `H` อัตโนมัติ, โลโก้ ≤ 500 KB เก็บเป็น data URL ใน style
- Server ไม่สร้าง `content` เอง — เก็บตามที่ Client ส่ง (ตรวจชนิด/ความยาว)
- ทุก query ต้องกรอง `owner_member_code` — ห้ามมี endpoint ที่คืน QR ของคนอื่น
- ทดสอบสแกนจริงด้วยมือถือทุกครั้งที่แก้ `qrContent.js` หรือ `qrStyle.js`
