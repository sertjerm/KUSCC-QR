// File: API/KusccQr.Api/Modules/QrCodes/Services/QrCodeService.cs
// Version: 1.1.0
// Description: Business logic ของ QR Code — ตรวจประเภท QR, ขนาด style, แปลง JSON ↔ string ก่อนส่ง Repository
//              Dynamic link: สุ่ม short_code, ให้ content = ลิงก์สั้น และเก็บปลายทางจริงไว้ที่ target_url
using System.Security.Cryptography;
using System.Text.Json;
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Modules.Lookups.Services;
using KusccQr.Api.Modules.QrCodes.DTOs;
using KusccQr.Api.Modules.QrCodes.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace KusccQr.Api.Modules.QrCodes.Services;

public sealed class QrCodeValidationException(string message) : Exception(message);

// appsettings: "DynamicLink": { "BaseUrl": "https://apps4.coop.ku.ac.th/kuscc-qr/api/r" }
// dev กับ production ใช้ DB COOP ตัวเดียวกัน จึงใช้ BaseUrl ของ production เสมอ — QR ที่สร้างจากเครื่อง dev สแกนได้จริง
public sealed class DynamicLinkOptions
{
    public const string SectionName = "DynamicLink";
    public string BaseUrl { get; set; } = string.Empty;
}

public sealed class QrCodeService(
    IQrCodeRepository repository,
    ILookupService lookupService,
    IOptions<DynamicLinkOptions> dynamicLinkOptions) : IQrCodeService
{
    // style อาจมีโลโก้เป็น data URL — จำกัดไม่เกิน ~1 MB ต่อรายการ
    private const int MaxStyleJsonLength = 1_000_000;
    private const int MaxDataJsonLength = 20_000;
    private const int MaxTargetUrlLength = 2000;

    // ตัด 0/o/1/l/i ที่อ่านสับสน — 31^7 ≈ 2.7 หมื่นล้านแบบ
    private const string ShortCodeAlphabet = "23456789abcdefghjkmnpqrstuvwxyz";
    private const int ShortCodeLength = 7;
    private const int ShortCodeMaxAttempts = 5;
    private const int MaxUserAgentLength = 400;

    private string ShortUrlBase => dynamicLinkOptions.Value.BaseUrl.TrimEnd('/');

    public async Task<PagedResult<QrCodeSummaryDto>> ListAsync(string ownerMemberCode, QrCodeListQuery query)
    {
        var (items, total) = await repository.ListAsync(ownerMemberCode, query.Search, query.Page, query.PageSize);
        return new PagedResult<QrCodeSummaryDto>
        {
            Items = items.Select(e => new QrCodeSummaryDto
            {
                Id = e.Id, Name = e.Name, QrType = e.QrType, Content = e.Content,
                ThumbnailDataUrl = e.ThumbnailDataUrl, DynamicLink = ToDynamicLink(e),
                CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
            }).ToList(),
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<QrCodeDetailDto?> GetAsync(int id, string ownerMemberCode)
    {
        var entity = await repository.GetAsync(id, ownerMemberCode);
        return entity is null ? null : ToDetail(entity);
    }

    public async Task<QrCodeDetailDto> CreateAsync(string ownerMemberCode, QrCodeSaveRequest request)
    {
        var entity = ToEntity(request, ownerMemberCode);
        if (!entity.IsDynamic)
        {
            entity.Id = await repository.InsertAsync(entity, ownerMemberCode);
        }
        else
        {
            await WithNewShortCodeAsync(entity, async () => entity.Id = await repository.InsertAsync(entity, ownerMemberCode));
        }
        return (await GetAsync(entity.Id, ownerMemberCode))!;
    }

    public async Task<QrCodeDetailDto?> UpdateAsync(int id, string ownerMemberCode, QrCodeSaveRequest request)
    {
        var existing = await repository.GetAsync(id, ownerMemberCode);
        if (existing is null) return null;
        if (existing.IsDynamic && !request.IsDynamic)
            throw new QrCodeValidationException("QR แบบ Dynamic ปิดเป็นแบบปกติไม่ได้ (ลิงก์ที่พิมพ์ไปแล้วจะใช้ไม่ได้) — ใช้ 'บันทึกเป็นอันใหม่' แทน");

        var entity = ToEntity(request, ownerMemberCode);
        entity.Id = id;

        if (!entity.IsDynamic || existing.ShortCode is not null)
        {
            // short_code เดิมคงไว้เสมอ (repository ใช้ COALESCE)
            if (existing.ShortCode is not null) SetShortCode(entity, existing.ShortCode);
            if (!await repository.UpdateAsync(entity, ownerMemberCode)) return null;
        }
        else
        {
            // เปลี่ยนจาก QR ปกติเป็น Dynamic ครั้งแรก
            var updated = false;
            await WithNewShortCodeAsync(entity, async () => updated = await repository.UpdateAsync(entity, ownerMemberCode));
            if (!updated) return null;
        }
        return await GetAsync(id, ownerMemberCode);
    }

    public Task<bool> DeleteAsync(int id, string ownerMemberCode) =>
        repository.SoftDeleteAsync(id, ownerMemberCode, ownerMemberCode);

    public async Task<string?> ResolveShortCodeAsync(string shortCode, string? userAgent)
    {
        var code = shortCode.Trim().ToLowerInvariant();
        if (code.Length is < 4 or > 16 || code.Any(c => !ShortCodeAlphabet.Contains(c))) return null;

        var target = await repository.FindRedirectAsync(code);
        if (target is null) return null;

        var agent = string.IsNullOrWhiteSpace(userAgent) ? null
            : userAgent.Length > MaxUserAgentLength ? userAgent[..MaxUserAgentLength] : userAgent;
        await repository.RecordScanAsync(target.Value.Id, agent);
        return target.Value.TargetUrl;
    }

    // สุ่ม short_code แล้วลองบันทึก — ถ้าชน unique index ให้สุ่มใหม่
    private async Task WithNewShortCodeAsync(QrCodeEntity entity, Func<Task> save)
    {
        if (string.IsNullOrWhiteSpace(ShortUrlBase))
            throw new InvalidOperationException("ยังไม่ได้ตั้งค่า DynamicLink:BaseUrl ใน appsettings");

        for (var attempt = 1; ; attempt++)
        {
            SetShortCode(entity, RandomNumberGenerator.GetString(ShortCodeAlphabet, ShortCodeLength));
            try
            {
                await save();
                return;
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627 && attempt < ShortCodeMaxAttempts)
            {
                // short_code ซ้ำ — วนสุ่มใหม่
            }
        }
    }

    private void SetShortCode(QrCodeEntity entity, string shortCode)
    {
        entity.ShortCode = shortCode;
        entity.Content = $"{ShortUrlBase}/{shortCode}";
    }

    private QrCodeEntity ToEntity(QrCodeSaveRequest request, string ownerMemberCode)
    {
        if (!lookupService.IsValidQrType(request.QrType))
            throw new QrCodeValidationException($"ไม่รู้จักประเภท QR '{request.QrType}'");
        if (request.Style.ValueKind != JsonValueKind.Object)
            throw new QrCodeValidationException("style ต้องเป็น JSON object");

        var dataJson = request.Data.ValueKind == JsonValueKind.Object ? request.Data.GetRawText() : "{}";
        var styleJson = request.Style.GetRawText();
        if (dataJson.Length > MaxDataJsonLength)
            throw new QrCodeValidationException("data มีขนาดใหญ่เกินกำหนด");
        if (styleJson.Length > MaxStyleJsonLength)
            throw new QrCodeValidationException("style มีขนาดใหญ่เกินกำหนด (ลดขนาดโลโก้ลง)");
        if (request.ThumbnailDataUrl is { } thumb && !thumb.StartsWith("data:image/", StringComparison.Ordinal))
            throw new QrCodeValidationException("thumbnailDataUrl ต้องเป็น data:image/...");

        string? targetUrl = null;
        if (request.IsDynamic)
        {
            if (request.QrType != "url")
                throw new QrCodeValidationException("Dynamic link ใช้ได้เฉพาะประเภท URL");
            targetUrl = request.Content.Trim();
            if (targetUrl.Length > MaxTargetUrlLength ||
                !Uri.TryCreate(targetUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
                throw new QrCodeValidationException("ปลายทางของ Dynamic link ต้องเป็นลิงก์ http:// หรือ https://");
        }

        return new QrCodeEntity
        {
            OwnerMemberCode = ownerMemberCode,
            Name = request.Name.Trim(),
            QrType = request.QrType,
            // Dynamic: content ถูกแทนด้วยลิงก์สั้นใน SetShortCode
            Content = request.Content,
            DataJson = dataJson,
            StyleJson = styleJson,
            ThumbnailDataUrl = request.ThumbnailDataUrl,
            IsDynamic = request.IsDynamic,
            TargetUrl = targetUrl
        };
    }

    private DynamicLinkDto? ToDynamicLink(QrCodeEntity e) =>
        !e.IsDynamic || e.ShortCode is null ? null : new DynamicLinkDto
        {
            ShortCode = e.ShortCode,
            ShortUrl = e.Content,
            TargetUrl = e.TargetUrl ?? string.Empty,
            ScanCount = e.ScanCount,
            LastScannedAt = e.LastScannedAt
        };

    private QrCodeDetailDto ToDetail(QrCodeEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        QrType = e.QrType,
        Content = e.Content,
        Data = ParseJson(e.DataJson),
        Style = ParseJson(e.StyleJson),
        ThumbnailDataUrl = e.ThumbnailDataUrl,
        DynamicLink = ToDynamicLink(e),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    private static JsonElement ParseJson(string json)
    {
        using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
        return document.RootElement.Clone();
    }
}
