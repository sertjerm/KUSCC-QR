// File: API/KusccQr.Api/Modules/QrCodes/Interfaces/IQrCodeInterfaces.cs
// Version: 1.1.0
// Description: สัญญาของ Service และ Repository ในโมดูล QR Codes — ทุก method กรองตามเจ้าของ (ownerMemberCode)
//              ยกเว้น FindRedirectAsync / RecordScanAsync ที่ใช้กับลิงก์สั้นสาธารณะ (คืนแค่ id + ปลายทาง)
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

    // Dynamic link — ไม่กรองเจ้าของ เพราะคนสแกนไม่ได้ login; คืนเฉพาะ id และ target_url ของ QR ที่ยังไม่ถูกลบ
    Task<(int Id, string TargetUrl)?> FindRedirectAsync(string shortCode);
    Task RecordScanAsync(int qrCodeId, string? userAgent);
}

public interface IQrCodeService
{
    Task<PagedResult<QrCodeSummaryDto>> ListAsync(string ownerMemberCode, QrCodeListQuery query);
    Task<QrCodeDetailDto?> GetAsync(int id, string ownerMemberCode);
    Task<QrCodeDetailDto> CreateAsync(string ownerMemberCode, QrCodeSaveRequest request);
    Task<QrCodeDetailDto?> UpdateAsync(int id, string ownerMemberCode, QrCodeSaveRequest request);
    Task<bool> DeleteAsync(int id, string ownerMemberCode);

    // คืน URL ปลายทางของลิงก์สั้น + บันทึกการสแกน; null = ไม่พบ / ถูกลบแล้ว
    Task<string?> ResolveShortCodeAsync(string shortCode, string? userAgent);
}
