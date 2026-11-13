// File: API/KusccQr.Api/Modules/QrCodes/DTOs/QrCodeDtos.cs
// Version: 1.1.0
// Description: DTO / Entity ของ QR Code ที่ผู้ใช้บันทึกไว้ — data และ style เป็น JSON object ส่งผ่านตรง ๆ
//              รวมข้อมูล Dynamic link (shortCode / targetUrl / scanCount)
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace KusccQr.Api.Modules.QrCodes.DTOs;

// แถวจากตาราง dbo.kuscc_qr_codes (Dapper map snake_case → PascalCase ผ่าน alias ใน SQL)
public sealed class QrCodeEntity
{
    public int Id { get; set; }
    public string OwnerMemberCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string QrType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
    public string StyleJson { get; set; } = "{}";
    public string? ThumbnailDataUrl { get; set; }
    public bool IsDynamic { get; set; }
    public string? ShortCode { get; set; }
    public string? TargetUrl { get; set; }
    public int ScanCount { get; set; }
    public DateTime? LastScannedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// ข้อมูล Dynamic link ที่ส่งกลับให้ Client (null = QR แบบปกติ)
public sealed class DynamicLinkDto
{
    public string ShortCode { get; set; } = string.Empty;
    public string ShortUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public int ScanCount { get; set; }
    public DateTime? LastScannedAt { get; set; }
}

public sealed class QrCodeSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string QrType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ThumbnailDataUrl { get; set; }
    public DynamicLinkDto? DynamicLink { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class QrCodeDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string QrType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public JsonElement Data { get; set; }
    public JsonElement Style { get; set; }
    public string? ThumbnailDataUrl { get; set; }
    public DynamicLinkDto? DynamicLink { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class QrCodeSaveRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string QrType { get; set; } = string.Empty;

    // ข้อความที่ encode ลง QR จริง (QR version 40 รับได้ราว 2,953 bytes)
    // isDynamic = true → ค่านี้คือ "ปลายทาง" (http/https) แล้ว Server แทน content ด้วยลิงก์สั้นเอง
    [Required, MaxLength(2953)]
    public string Content { get; set; } = string.Empty;

    // ค่าที่กรอกในฟอร์มตามประเภท เช่น { ssid, password, encryption } — ใช้โหลดกลับมาแก้
    public JsonElement Data { get; set; }

    // options ของ qr-code-styling ทั้งก้อน (ไม่รวม data) — ใช้ render ซ้ำได้ 100%
    public JsonElement Style { get; set; }

    // ภาพย่อ PNG แบบ data URL (ไม่บังคับ) จำกัด ~200 KB
    [MaxLength(280_000)]
    public string? ThumbnailDataUrl { get; set; }

    // Dynamic link — ใช้ได้เฉพาะ qrType = url; เปิดแล้วปิดไม่ได้ (ลิงก์ที่พิมพ์ไปแล้วต้องใช้ได้ต่อ)
    public bool IsDynamic { get; set; }
}

public sealed class QrCodeListQuery
{
    [MaxLength(100)]
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
