// File: API/KusccQr.Api/Modules/QrCodes/Interfaces/IQrCodeInterfaces.cs
// Version: 1.0.0
// Description: สัญญาของ Service และ Repository ในโมดูล QR Codes — ทุก method กรองตามเจ้าของ (ownerMemberCode)
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Modules.QrCodes.DTOs;

namespace KusccQr.Api.Modules.QrCodes.Interfaces;

public interface IQrCodeRepository
{
    Task<(IReadOnlyList<QrCodeEntity> Items, int Total)> ListAsync(string ownerMemberCode, string? search, int page, int pageSize);
    Task<QrCodeEntity?> GetAsync(int id, string ownerMemberCode);
    Task<int> InsertAsync(QrCodeEntity entity, string actor);
    Task<bool> UpdateAsync(QrCodeEntity entity, string actor);
    Task<bool> SoftDeleteAsync(int id, string ownerMemberCode, string actor);
}

public interface IQrCodeService
{
    Task<PagedResult<QrCodeSummaryDto>> ListAsync(string ownerMemberCode, QrCodeListQuery query);
    Task<QrCodeDetailDto?> GetAsync(int id, string ownerMemberCode);
    Task<QrCodeDetailDto> CreateAsync(string ownerMemberCode, QrCodeSaveRequest request);
    Task<QrCodeDetailDto?> UpdateAsync(int id, string ownerMemberCode, QrCodeSaveRequest request);
    Task<bool> DeleteAsync(int id, string ownerMemberCode);
}
