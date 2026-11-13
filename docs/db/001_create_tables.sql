-- File: docs/db/001_create_tables.sql
-- Version: 1.0.0
-- Description: สร้างตารางของ KUSCC-QR บน MSSQL (รันครั้งเดียว — ตรวจ IF NOT EXISTS ก่อนสร้าง)

-- ---------------------------------------------------------------
-- QR Code ที่ผู้ใช้บันทึกไว้ (เจ้าของ = MemberCode จาก SSO token)
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.kuscc_qr_codes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.kuscc_qr_codes (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_kuscc_qr_codes PRIMARY KEY,
        owner_member_code   VARCHAR(10)    NOT NULL,              -- รหัสสมาชิก 6 หลัก (เติม 0)
        name                NVARCHAR(200)  NOT NULL,
        qr_type             VARCHAR(20)    NOT NULL,              -- url | text | vcard | wifi | email | tel
        content             NVARCHAR(3000) NOT NULL,              -- ข้อความที่ encode ลง QR จริง
        data_json           NVARCHAR(MAX)  NOT NULL CONSTRAINT df_kuscc_qr_codes_data DEFAULT ('{}'),   -- ค่าฟอร์ม
        style_json          NVARCHAR(MAX)  NOT NULL CONSTRAINT df_kuscc_qr_codes_style DEFAULT ('{}'),  -- options ของ qr-code-styling
        thumbnail_data_url  NVARCHAR(MAX)  NULL,                  -- PNG 200px แบบ data URL
        is_deleted          BIT            NOT NULL CONSTRAINT df_kuscc_qr_codes_deleted DEFAULT (0),
        created_at          DATETIME2(0)   NOT NULL CONSTRAINT df_kuscc_qr_codes_created DEFAULT (SYSDATETIME()),
        created_by          VARCHAR(10)    NOT NULL,
        updated_at          DATETIME2(0)   NOT NULL CONSTRAINT df_kuscc_qr_codes_updated DEFAULT (SYSDATETIME()),
        updated_by          VARCHAR(10)    NOT NULL
    );

    CREATE INDEX ix_kuscc_qr_codes_owner
        ON dbo.kuscc_qr_codes (owner_member_code, is_deleted, updated_at DESC);
END
GO

-- ---------------------------------------------------------------
-- Brand preset ขององค์กร (admin จัดการ — Phase 2)
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.kuscc_qr_brand_presets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.kuscc_qr_brand_presets (
        id           INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_kuscc_qr_brand_presets PRIMARY KEY,
        name         NVARCHAR(100) NOT NULL,
        description  NVARCHAR(500) NULL,
        style_json   NVARCHAR(MAX) NOT NULL,
        sort_order   INT           NOT NULL CONSTRAINT df_kuscc_qr_brand_presets_sort DEFAULT (0),
        is_active    BIT           NOT NULL CONSTRAINT df_kuscc_qr_brand_presets_active DEFAULT (1),
        created_at   DATETIME2(0)  NOT NULL CONSTRAINT df_kuscc_qr_brand_presets_created DEFAULT (SYSDATETIME()),
        updated_at   DATETIME2(0)  NOT NULL CONSTRAINT df_kuscc_qr_brand_presets_updated DEFAULT (SYSDATETIME())
    );

    -- preset ตั้งต้น (ปรับสีให้ตรง CI องค์กรได้ภายหลัง)
    INSERT INTO dbo.kuscc_qr_brand_presets (name, description, style_json, sort_order) VALUES
    (N'KUSCC เขียว', N'สีหลักขององค์กร',
     N'{"dotsOptions":{"type":"rounded","color":"#0b6e4f"},"cornersSquareOptions":{"type":"extra-rounded","color":"#064e3b"},"cornersDotOptions":{"type":"dot","color":"#064e3b"},"backgroundOptions":{"color":"#ffffff"}}', 1),
    (N'KUSCC ไล่สี', N'เขียวไล่สีฟ้าอมเขียว',
     N'{"dotsOptions":{"type":"classy-rounded","color":"#0b6e4f","gradient":{"type":"linear","rotation":0.785,"colorStops":[{"offset":0,"color":"#0b6e4f"},{"offset":1,"color":"#0f766e"}]}},"cornersSquareOptions":{"type":"extra-rounded","color":"#064e3b"},"cornersDotOptions":{"type":"dot","color":"#0f766e"},"backgroundOptions":{"color":"#ffffff"}}', 2),
    (N'ขาวดำคลาสสิก', N'สแกนง่ายที่สุด เหมาะกับงานพิมพ์ขาวดำ',
     N'{"dotsOptions":{"type":"square","color":"#000000"},"cornersSquareOptions":{"type":"square","color":"#000000"},"cornersDotOptions":{"type":"square","color":"#000000"},"backgroundOptions":{"color":"#ffffff"}}', 3);
END
GO
