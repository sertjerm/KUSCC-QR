# KUSCC-QR — API Specification

> **Single source of truth ของสัญญา API** ระหว่าง `API/` (ASP.NET Core 8) และ `Client/` (React)
> แก้ endpoint / DTO เมื่อไร **ต้องแก้ไฟล์นี้ในการเปลี่ยนแปลงเดียวกัน** (ทั้ง Claude Code และ Codex อ่านไฟล์นี้)

| | |
|---|---|
| Base URL (dev) | `http://localhost:{PORT_API}` — ค่า port อยู่ที่ `ports.env` (ตอนนี้ `5250`) |
| Base URL (prod) | `https://apps4.coop.ku.ac.th/kuscc-qr/api` |
| Swagger (dev เท่านั้น) | `http://localhost:5250/swagger` |
| Content-Type | `application/json; charset=utf-8` |
| JSON naming | **camelCase** ทั้ง request และ response (ห้าม PascalCase / snake_case) |
| Route | ไม่มี `/api/` ใน `[Route]` — IIS เติม prefix ให้เอง |

---

## 1. Authentication

ทุก endpoint **ต้องแนบ** `Authorization: Bearer <sso_token>` ยกเว้นที่ระบุว่า *Public*

- token ได้จาก KUSCC-SSO (`localStorage.sso_token`) — ดู `~/Dev/NetCore/SSO/SSO_INTEGRATION_GUIDE.md`
- API ตรวจ token ด้วย `GET https://apps4.coop.ku.ac.th/kusccsso/api/Auth/verify-token` (server-to-server)
  แล้ว cache ผลไว้ `Sso:VerifyCacheSeconds` วินาที (ค่าเริ่มต้น 60)
- เจ้าของข้อมูล = claim `MemberCode` (เติม 0 ให้ครบ 6 หลัก) — ผู้ใช้เห็น/แก้ได้เฉพาะ QR ของตัวเอง
- token ไม่มี / หมดอายุ / verify ไม่ผ่าน → `401`; Client จะลอง refresh 1 ครั้ง แล้ว redirect ไป SSO

**โหมดทดสอบ (dev เท่านั้น)** — `./start.sh 3`
- Client ส่ง token คงที่ `SsoAuthenticationHandler.DevBypassToken` (ไม่ผ่าน SSO)
- API ยอมรับก็ต่อเมื่อครบ 3 ข้อ: `ASPNETCORE_ENVIRONMENT=Development`, `Sso:DevBypass=true`, request มาจาก loopback
  → ได้ผู้ใช้ `MemberCode = Sso:DevBypassMemberCode` (ค่าเริ่มต้น `999999`)
- ไม่ครบเงื่อนไข → `401` เหมือน token ปลอมทั่วไป

## 2. รูปแบบ Response มาตรฐาน

ทุก endpoint (ยกเว้น `/health`) ตอบเป็น `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "บันทึกแล้ว",
  "data": { },
  "errors": []
}
```

| HTTP | ความหมาย | `success` |
|---|---|---|
| 200 / 201 | สำเร็จ | `true` |
| 400 | ข้อมูลไม่ถูกต้อง — ข้อความอยู่ใน `message` / `errors` | `false` |
| 401 | ไม่มี token หรือ token ใช้ไม่ได้ | `false` |
| 404 | ไม่พบข้อมูล (หรือไม่ใช่ของผู้ใช้คนนี้) | `false` |
| 500 | error ภายใน (เช่น ต่อ DB ไม่ได้) — `message` มีรายละเอียดเฉพาะ Development | `false` |

400 จาก model validation (`[Required]`, `[MaxLength]`, `[Range]`) ก็ใช้รูปแบบเดียวกัน:
`{ "success": false, "message": "ข้อมูลไม่ถูกต้อง", "errors": ["name: The Name field is required."] }`
(ตั้งที่ `InvalidModelStateResponseFactory` ใน `Program.cs`)

Client (`src/utils/apiClient.js`) แกะ `data` ออกให้แล้ว — ฟังก์ชันใน `src/api/qrApi.js` คืนค่า `data` ตรง ๆ

---

## 3. Endpoints

### 3.1 `GET /health` — *Public*

```json
{ "status": "Healthy", "timestamp": "2026-11-13T10:00:00+07:00" }
```

### 3.2 `GET /lookups`

ตัวเลือก dropdown ทั้งหมดของหน้า Designer — **frontend ห้าม hardcode รายการเหล่านี้**
`value` ตรงกับ option ของไลบรารี [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling)

```json
{
  "success": true,
  "data": {
    "qrTypes":               [{ "value": "url", "label": "ลิงก์เว็บไซต์ (URL)" }, "..."],
    "dotTypes":              [{ "value": "rounded", "label": "มุมมน" }, "..."],
    "cornerSquareTypes":     [{ "value": "extra-rounded", "label": "มุมมน" }, "..."],
    "cornerDotTypes":        [{ "value": "dot", "label": "วงกลม" }, "..."],
    "gradientTypes":         [{ "value": "none", "label": "สีเดียว" }, "..."],
    "errorCorrectionLevels": [{ "value": "H", "label": "H — สูงสุด (30%) แนะนำเมื่อมีโลโก้" }, "..."],
    "exportFormats":         [{ "value": "png", "label": "PNG" }, "..."],
    "wifiEncryptions":       [{ "value": "WPA", "label": "WPA/WPA2/WPA3" }, "..."],
    "textPositions":         [{ "value": "bottom", "label": "ใต้ QR" }, "..."],
    "logoShapes":            [{ "value": "circle", "label": "วงกลม" }, "..."]
  }
}
```

| key | ค่าที่เป็นไปได้ (`value`) |
|---|---|
| `qrTypes` | `url`, `text`, `vcard`, `wifi`, `email`, `tel` |
| `dotTypes` | `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded` |
| `cornerSquareTypes` | `square`, `extra-rounded`, `dot` |
| `cornerDotTypes` | `square`, `dot` |
| `gradientTypes` | `none`, `linear`, `radial` |
| `errorCorrectionLevels` | `L`, `M`, `Q`, `H` |
| `exportFormats` | `png`, `svg`, `jpeg`, `webp` |
| `wifiEncryptions` | `WPA`, `WEP`, `nopass` |
| `textPositions` | `bottom`, `top` |
| `logoShapes` | `square`, `rounded`, `circle` |

ที่มา: `API/KusccQr.Api/Modules/Lookups/LookupModule.cs`

### 3.3 `GET /brand-presets`

ธีมสำเร็จรูปขององค์กร (`is_active = 1`) เรียงตาม `sortOrder`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "KUSCC เขียว",
      "description": "สีหลักขององค์กร",
      "style": { "dotsOptions": { "type": "rounded", "color": "#0b6e4f" }, "...": "..." },
      "sortOrder": 1
    }
  ]
}
```

`style` เป็นโครง **QrStyle** บางส่วน (ดูข้อ 4) — Client merge ทับค่าเริ่มต้น (คงโลโก้เดิมไว้)

### 3.4 `GET /qr-codes`

รายการ QR ของผู้ใช้ เรียง `updatedAt` ล่าสุดก่อน

| Query | ชนิด | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|---|
| `search` | string ≤ 100 | – | ค้นใน `name` และ `content` (LIKE) |
| `page` | int ≥ 1 | 1 | |
| `pageSize` | int 1–100 | 20 | |

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12,
        "name": "โปสเตอร์ประชุมใหญ่ 2569",
        "qrType": "url",
        "content": "https://www.kuscc.com",
        "thumbnailDataUrl": "data:image/png;base64,...",
        "createdAt": "2026-11-13T10:00:00",
        "updatedAt": "2026-11-13T10:05:00"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

> list **ไม่ส่ง** `data` / `style` เพื่อให้ payload เล็ก — ต้องเรียก `GET /qr-codes/{id}` เมื่อจะแก้

### 3.5 `GET /qr-codes/{id}`

```json
{
  "success": true,
  "data": {
    "id": 12,
    "name": "โปสเตอร์ประชุมใหญ่ 2569",
    "qrType": "url",
    "content": "https://www.kuscc.com",
    "data":  { "url": "https://www.kuscc.com" },
    "style": { "margin": 16, "qrOptions": { "errorCorrectionLevel": "Q" }, "...": "..." },
    "thumbnailDataUrl": "data:image/png;base64,...",
    "createdAt": "2026-11-13T10:00:00",
    "updatedAt": "2026-11-13T10:05:00"
  }
}
```

404 ถ้าไม่พบ / ถูกลบแล้ว / เป็นของคนอื่น

### 3.6 `POST /qr-codes` → `201 Created`

Request body — **QrCodeSaveRequest**

| field | ชนิด | บังคับ | กติกา |
|---|---|---|---|
| `name` | string | ✅ | ≤ 200 ตัวอักษร |
| `qrType` | string | ✅ | ต้องอยู่ใน `lookups.qrTypes` |
| `content` | string | ✅ | ข้อความที่ encode ลง QR จริง ≤ 2,953 ตัวอักษร (Client สร้างจาก `data`) |
| `data` | object | – | ค่าฟอร์มตามประเภท (ข้อ 5) ≤ 20,000 ตัวอักษรเมื่อ serialize |
| `style` | object | ✅ | โครง **QrStyle** (ข้อ 4) ≤ 1,000,000 ตัวอักษร (รวมโลโก้ data URL) |
| `thumbnailDataUrl` | string \| null | – | ต้องขึ้นต้น `data:image/` ≤ 280,000 ตัวอักษร |

```json
{
  "name": "Wi-Fi ห้องประชุม",
  "qrType": "wifi",
  "content": "WIFI:T:WPA;S:KUSCC-Meeting;P:secret;;",
  "data": { "ssid": "KUSCC-Meeting", "password": "secret", "encryption": "WPA", "hidden": false },
  "style": { "margin": 16, "dotsOptions": { "type": "dots", "color": "#0b6e4f" } },
  "thumbnailDataUrl": "data:image/png;base64,..."
}
```

Response: `ApiResponse<QrCodeDetail>` (โครงเดียวกับข้อ 3.5), header `Location: /qr-codes/{id}`

### 3.7 `PUT /qr-codes/{id}`

body เหมือน `POST` (แทนที่ทั้งรายการ) → `200` + `QrCodeDetail` | `404`

### 3.8 `DELETE /qr-codes/{id}`

Soft delete (`is_deleted = 1`) → `200` + `{ "id": 12 }` | `404`

---

## 4. โครง `QrStyle`

คือ options ของ `qr-code-styling` **ยกเว้น** `data`, `width`, `height`, `type` (Client ใส่ตอน render/export)
**บวก** field ของแอปเราเอง (ไลบรารีไม่รู้จัก — `qrRenderer.js` จัดการก่อนส่งให้ไลบรารี): `textOptions` และ `imageOptions.shape`
`margin` และ `textOptions.fontSize` เก็บเทียบกับภาพกว้าง 600px แล้ว Client ขยายตามขนาด export

```json
{
  "margin": 16,
  "qrOptions": { "errorCorrectionLevel": "Q" },
  "dotsOptions": {
    "type": "rounded",
    "color": "#0b6e4f",
    "gradient": {
      "type": "linear",
      "rotation": 0.785,
      "colorStops": [{ "offset": 0, "color": "#0b6e4f" }, { "offset": 1, "color": "#0f766e" }]
    }
  },
  "cornersSquareOptions": { "type": "extra-rounded", "color": "#064e3b" },
  "cornersDotOptions": { "type": "dot", "color": "#064e3b" },
  "backgroundOptions": { "color": "#ffffff" },
  "image": "data:image/png;base64,... | null",
  "imageOptions": { "imageSize": 0.35, "margin": 6, "hideBackgroundDots": true, "crossOrigin": "anonymous", "shape": "circle" },
  "textOptions": { "text": "สแกนเพื่อลงทะเบียน", "position": "bottom", "color": "#064e3b", "fontSize": 36, "bold": true }
}
```

- `dotsOptions.gradient` ไม่มี = สีเดียว; `rotation` เป็น radian
- `backgroundOptions.color = "transparent"` = พื้นโปร่งใส
- `imageOptions.shape`: `square` (ภาพเดิม, ค่าเริ่มต้น) | `rounded` | `circle` — crop กลางภาพเป็นจัตุรัสแล้วตัดขอบตอน render; `image` ที่เก็บยังเป็นภาพต้นฉบับ
- `textOptions.text` ว่าง = ไม่มีข้อความ; ขึ้นบรรทัดใหม่ด้วย `\n`; ข้อความยาวเกิน 90% ของความกว้างจะถูกย่อฟอนต์อัตโนมัติ
  ภาพที่มีข้อความจะสูงกว่าความกว้าง (ไม่ใช่สี่เหลี่ยมจัตุรัส) — SVG ใช้ฟอนต์ Noto Sans Thai ของเครื่องที่เปิดไฟล์
- QR ที่บันทึกก่อนมี `textOptions` → Client เติมค่าเริ่มต้นให้ (`mergeStyle(DEFAULT_STYLE, style)`)
- ค่าเริ่มต้นอยู่ที่ `Client/src/modules/designer/utils/qrStyle.js` (`DEFAULT_STYLE`)

## 5. โครง `data` และการสร้าง `content` ตาม `qrType`

ตรรกะอยู่ที่ `Client/src/modules/designer/utils/qrContent.js` (`buildQrContent`)

| qrType | `data` | `content` ที่ได้ |
|---|---|---|
| `url` | `{ url }` | `https://...` |
| `text` | `{ text }` | ข้อความตรง ๆ |
| `tel` | `{ phone }` | `tel:021234567` |
| `email` | `{ to, subject, body }` | `mailto:a@b.com?subject=...&body=...` |
| `wifi` | `{ ssid, password, encryption, hidden }` | `WIFI:T:WPA;S:...;P:...;H:true;;` (escape `\ ; , : "`) |
| `vcard` | `{ firstName, lastName, org, title, mobile, phone, email, website, address }` | vCard 3.0 |

> Server **ไม่สร้าง** `content` เอง — เก็บตามที่ Client ส่งมา (ตรวจแค่ชนิดและความยาว)

---

## 6. Database (MSSQL)

Database: `COOP` (ตัวเดียวกับ KUSCC-CENTER) · สคริปต์: `docs/db/001_create_tables.sql` (รันแล้ว 2026-11-13)

| ตาราง | หน้าที่ |
|---|---|
| `dbo.kuscc_qr_codes` | QR ที่ผู้ใช้บันทึก (`data_json`, `style_json` เก็บ JSON ดิบ) |
| `dbo.kuscc_qr_brand_presets` | ธีมองค์กร |

Connection string: `ConnectionStrings:DefaultConnection` — **ห้าม commit รหัสผ่าน**
ตั้งใน `API/KusccQr.Api/appsettings.Local.json` (อยู่ใน `.gitignore`, โหลดอัตโนมัติ) หรือ environment variable `ConnectionStrings__DefaultConnection`

---

## 7. Roadmap (ยังไม่ได้ทำ — สัญญาร่าง)

| Phase | Endpoint | หมายเหตุ |
|---|---|---|
| 2 | `POST/PUT/DELETE /brand-presets` | admin เท่านั้น (ตรวจสิทธิ์ผ่าน `kuscc_app_roles` ของ KUSCC-CENTER) |
| 2 | `qrType = promptpay` | payload EMVCo + CRC16 สร้างฝั่ง Client |
| 3 | `GET /r/{shortCode}` *Public* | Dynamic QR → `302` ไป `target_url` + บันทึกการสแกน |
| 3 | `GET /qr-codes/{id}/stats` | จำนวนสแกนรายวัน |
| 3 | `POST /qr-codes/bulk` | สร้างจาก CSV |

---

## Changelog

| วันที่ | เวอร์ชัน | รายละเอียด |
|---|---|---|
| 2026-11-13 | 1.0.0 | สัญญาแรก: health, lookups, brand-presets (read), qr-codes CRUD |
| 2026-11-13 | 1.1.0 | เพิ่ม `style.textOptions` (ข้อความเหนือ/ใต้ QR) และ `lookups.textPositions` |
| 2026-11-13 | 1.2.0 | 500 ตอบเป็น `ApiResponse`, เพิ่มโหมดทดสอบ (dev bypass) |
| 2026-11-13 | 1.3.0 | เพิ่ม `style.imageOptions.shape` (โลโก้มุมมน/วงกลม) และ `lookups.logoShapes` |
