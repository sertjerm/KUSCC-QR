// File: API/KusccQr.Api/Modules/Lookups/LookupModule.cs
// Version: 1.1.0
// Description: ตัวเลือก dropdown ทั้งหมดของหน้า Designer (ประเภท QR, รูปทรงจุด/มุม, ระดับแก้ผิด, รูปแบบไฟล์)
//              ค่า value ต้องตรงกับ option ของไลบรารี qr-code-styling — frontend ห้าม hardcode รายการเหล่านี้เอง
using KusccQr.Api.Common.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace KusccQr.Api.Modules.Lookups.Services
{
    public record LookupOption(string Value, string Label);

    public record LookupsDto(
        IReadOnlyList<LookupOption> QrTypes,
        IReadOnlyList<LookupOption> DotTypes,
        IReadOnlyList<LookupOption> CornerSquareTypes,
        IReadOnlyList<LookupOption> CornerDotTypes,
        IReadOnlyList<LookupOption> GradientTypes,
        IReadOnlyList<LookupOption> ErrorCorrectionLevels,
        IReadOnlyList<LookupOption> ExportFormats,
        IReadOnlyList<LookupOption> WifiEncryptions,
        IReadOnlyList<LookupOption> TextPositions);

    public interface ILookupService
    {
        LookupsDto GetAll();
        bool IsValidQrType(string qrType);
    }

    public sealed class LookupService : ILookupService
    {
        private static readonly LookupsDto Lookups = new(
            QrTypes:
            [
                new("url", "ลิงก์เว็บไซต์ (URL)"),
                new("text", "ข้อความ"),
                new("vcard", "นามบัตร (vCard)"),
                new("wifi", "Wi-Fi"),
                new("email", "อีเมล"),
                new("tel", "เบอร์โทรศัพท์"),
            ],
            DotTypes:
            [
                new("square", "สี่เหลี่ยม"),
                new("dots", "จุดกลม"),
                new("rounded", "มุมมน"),
                new("extra-rounded", "มนมาก"),
                new("classy", "คลาสสิก"),
                new("classy-rounded", "คลาสสิกมน"),
            ],
            CornerSquareTypes:
            [
                new("square", "สี่เหลี่ยม"),
                new("extra-rounded", "มุมมน"),
                new("dot", "วงกลม"),
            ],
            CornerDotTypes:
            [
                new("square", "สี่เหลี่ยม"),
                new("dot", "วงกลม"),
            ],
            GradientTypes:
            [
                new("none", "สีเดียว"),
                new("linear", "ไล่สีแนวเส้น"),
                new("radial", "ไล่สีวงกลม"),
            ],
            ErrorCorrectionLevels:
            [
                new("L", "L — ต่ำ (7%)"),
                new("M", "M — ปานกลาง (15%)"),
                new("Q", "Q — สูง (25%)"),
                new("H", "H — สูงสุด (30%) แนะนำเมื่อมีโลโก้"),
            ],
            ExportFormats:
            [
                new("png", "PNG"),
                new("svg", "SVG (สำหรับงานพิมพ์)"),
                new("jpeg", "JPEG"),
                new("webp", "WEBP"),
            ],
            WifiEncryptions:
            [
                new("WPA", "WPA/WPA2/WPA3"),
                new("WEP", "WEP"),
                new("nopass", "ไม่มีรหัสผ่าน"),
            ],
            TextPositions:
            [
                new("bottom", "ใต้ QR"),
                new("top", "เหนือ QR"),
            ]);

        public LookupsDto GetAll() => Lookups;

        public bool IsValidQrType(string qrType) => Lookups.QrTypes.Any(t => t.Value == qrType);
    }
}

namespace KusccQr.Api.Modules.Lookups.Controllers
{
    using KusccQr.Api.Modules.Lookups.Services;

    [ApiController]
    [Route("lookups")]
    public sealed class LookupsController(ILookupService lookupService) : ControllerBase
    {
        [HttpGet]
        public ActionResult<ApiResponse<LookupsDto>> Get() => Ok(ApiResponse<LookupsDto>.Ok(lookupService.GetAll()));
    }
}
