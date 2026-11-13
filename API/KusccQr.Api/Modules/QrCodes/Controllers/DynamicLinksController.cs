// File: API/KusccQr.Api/Modules/QrCodes/Controllers/DynamicLinksController.cs
// Version: 1.0.0
// Description: ลิงก์สั้นของ Dynamic QR (Public — คนสแกนไม่ต้อง login) → 302 ไปปลายทางล่าสุด + นับการสแกน
//              ไม่พบ/ถูกลบ → หน้า HTML ภาษาไทย 404 (เปิดจากมือถือ จึงไม่ตอบ JSON)
using KusccQr.Api.Modules.QrCodes.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KusccQr.Api.Modules.QrCodes.Controllers;

[ApiController]
[AllowAnonymous]
[Route("r")]
public sealed class DynamicLinksController(IQrCodeService service) : ControllerBase
{
    private const string NotFoundHtml = """
        <!doctype html>
        <html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>ไม่พบลิงก์</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px;color:#064e3b">
        <h1 style="font-size:1.4rem">ไม่พบลิงก์นี้</h1>
        <p>QR Code นี้อาจถูกยกเลิกแล้ว กรุณาติดต่อผู้จัดทำ</p>
        <p style="color:#6b7280;font-size:.9rem">สหกรณ์ออมทรัพย์มหาวิทยาลัยเกษตรศาสตร์ จำกัด</p>
        </body></html>
        """;

    [HttpGet("{shortCode}")]
    public async Task<IActionResult> Go(string shortCode)
    {
        // ห้าม cache — เจ้าของเปลี่ยนปลายทางแล้วต้องมีผลทันที และนับการสแกนทุกครั้ง
        Response.Headers.CacheControl = "no-store";

        var target = await service.ResolveShortCodeAsync(shortCode, Request.Headers.UserAgent.ToString());
        if (target is null)
        {
            return new ContentResult
            {
                StatusCode = StatusCodes.Status404NotFound,
                ContentType = "text/html; charset=utf-8",
                Content = NotFoundHtml
            };
        }
        return Redirect(target);
    }
}
