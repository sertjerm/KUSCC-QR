-- File: docs/db/002_dynamic_links.sql
-- Version: 1.0.0
-- Description: Dynamic QR — เพิ่มคอลัมน์ลิงก์สั้นใน dbo.kuscc_qr_codes และตารางบันทึกการสแกน (รันซ้ำได้ ตรวจก่อนสร้าง)
--              QR แบบ dynamic encode ลิงก์ https://apps4.coop.ku.ac.th/kuscc-qr/api/r/{short_code}
--              แล้ว API redirect (302) ไป target_url — เปลี่ยนปลายทางได้โดยไม่ต้องพิมพ์ QR ใหม่

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.kuscc_qr_codes', 'is_dynamic') IS NULL
BEGIN
    ALTER TABLE dbo.kuscc_qr_codes ADD
        is_dynamic       BIT            NOT NULL CONSTRAINT df_kuscc_qr_codes_dynamic DEFAULT (0),
        short_code       VARCHAR(16)    NULL,     -- รหัสลิงก์สั้น (ตัวพิมพ์เล็ก/ตัวเลข) กำหนดครั้งเดียว ห้ามเปลี่ยน
        target_url       NVARCHAR(2000) NULL,     -- ปลายทางที่ redirect ไป (แก้ได้)
        scan_count       INT            NOT NULL CONSTRAINT df_kuscc_qr_codes_scan_count DEFAULT (0),
        last_scanned_at  DATETIME2(0)   NULL;
END
GO

-- short_code ต้องไม่ซ้ำทั้งระบบ (ทุกเจ้าของ) — รวมรายการที่ถูกลบ เพื่อไม่ให้ลิงก์ที่พิมพ์ไปแล้วชี้ไป QR ของคนอื่น
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_kuscc_qr_codes_short_code' AND object_id = OBJECT_ID('dbo.kuscc_qr_codes'))
BEGIN
    CREATE UNIQUE INDEX ux_kuscc_qr_codes_short_code
        ON dbo.kuscc_qr_codes (short_code)
        WHERE short_code IS NOT NULL;
END
GO

-- ---------------------------------------------------------------
-- บันทึกการสแกน (ไม่เก็บ IP — เก็บเวลาและ user agent เท่านั้น)
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.kuscc_qr_scans', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.kuscc_qr_scans (
        id           BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_kuscc_qr_scans PRIMARY KEY,
        qr_code_id   INT            NOT NULL CONSTRAINT fk_kuscc_qr_scans_qr_code REFERENCES dbo.kuscc_qr_codes (id),
        scanned_at   DATETIME2(0)   NOT NULL CONSTRAINT df_kuscc_qr_scans_scanned DEFAULT (SYSDATETIME()),
        user_agent   NVARCHAR(400)  NULL
    );

    CREATE INDEX ix_kuscc_qr_scans_qr_code
        ON dbo.kuscc_qr_scans (qr_code_id, scanned_at);
END
GO
