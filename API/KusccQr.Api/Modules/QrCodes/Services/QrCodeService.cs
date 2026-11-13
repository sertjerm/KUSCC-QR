// File: API/KusccQr.Api/Modules/QrCodes/Services/QrCodeService.cs
// Version: 1.0.0
// Description: Business logic ของ QR Code — ตรวจประเภท QR, ขนาด style, แปลง JSON ↔ string ก่อนส่ง Repository
using System.Text.Json;
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Modules.Lookups.Services;
using KusccQr.Api.Modules.QrCodes.DTOs;
using KusccQr.Api.Modules.QrCodes.Interfaces;

namespace KusccQr.Api.Modules.QrCodes.Services;

public sealed class QrCodeValidationException(string message) : Exception(message);

public sealed class QrCodeService(IQrCodeRepository repository, ILookupService lookupService) : IQrCodeService
{
    // style อาจมีโลโก้เป็น data URL — จำกัดไม่เกิน ~1 MB ต่อรายการ
    private const int MaxStyleJsonLength = 1_000_000;
    private const int MaxDataJsonLength = 20_000;

    public async Task<PagedResult<QrCodeSummaryDto>> ListAsync(string ownerMemberCode, QrCodeListQuery query)
    {
        var (items, total) = await repository.ListAsync(ownerMemberCode, query.Search, query.Page, query.PageSize);
        return new PagedResult<QrCodeSummaryDto>
        {
            Items = items.Select(e => new QrCodeSummaryDto
            {
                Id = e.Id, Name = e.Name, QrType = e.QrType, Content = e.Content,
                ThumbnailDataUrl = e.ThumbnailDataUrl, CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
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
        entity.Id = await repository.InsertAsync(entity, ownerMemberCode);
        return (await GetAsync(entity.Id, ownerMemberCode))!;
    }

    public async Task<QrCodeDetailDto?> UpdateAsync(int id, string ownerMemberCode, QrCodeSaveRequest request)
    {
        var entity = ToEntity(request, ownerMemberCode);
        entity.Id = id;
        if (!await repository.UpdateAsync(entity, ownerMemberCode)) return null;
        return await GetAsync(id, ownerMemberCode);
    }

    public Task<bool> DeleteAsync(int id, string ownerMemberCode) =>
        repository.SoftDeleteAsync(id, ownerMemberCode, ownerMemberCode);

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

        return new QrCodeEntity
        {
            OwnerMemberCode = ownerMemberCode,
            Name = request.Name.Trim(),
            QrType = request.QrType,
            Content = request.Content,
            DataJson = dataJson,
            StyleJson = styleJson,
            ThumbnailDataUrl = request.ThumbnailDataUrl
        };
    }

    private static QrCodeDetailDto ToDetail(QrCodeEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        QrType = e.QrType,
        Content = e.Content,
        Data = ParseJson(e.DataJson),
        Style = ParseJson(e.StyleJson),
        ThumbnailDataUrl = e.ThumbnailDataUrl,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    private static JsonElement ParseJson(string json)
    {
        using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
        return document.RootElement.Clone();
    }
}
