// File: API/KusccQr.Api/Modules/QrCodes/Controllers/QrCodesController.cs
// Version: 1.0.0
// Description: CRUD QR Code ของผู้ใช้ที่ login — เห็น/แก้ได้เฉพาะของตัวเอง (กรองด้วย MemberCode จาก token)
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Infrastructure.Auth;
using KusccQr.Api.Modules.QrCodes.DTOs;
using KusccQr.Api.Modules.QrCodes.Interfaces;
using KusccQr.Api.Modules.QrCodes.Services;
using Microsoft.AspNetCore.Mvc;

namespace KusccQr.Api.Modules.QrCodes.Controllers;

[ApiController]
[Route("qr-codes")]
public sealed class QrCodesController(IQrCodeService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<QrCodeSummaryDto>>>> List([FromQuery] QrCodeListQuery query)
    {
        var result = await service.ListAsync(User.GetMemberCode(), query);
        return Ok(ApiResponse<PagedResult<QrCodeSummaryDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<QrCodeDetailDto>>> Get(int id)
    {
        var result = await service.GetAsync(id, User.GetMemberCode());
        return result is null
            ? NotFound(ApiResponse<QrCodeDetailDto>.Fail("ไม่พบ QR Code"))
            : Ok(ApiResponse<QrCodeDetailDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<QrCodeDetailDto>>> Create([FromBody] QrCodeSaveRequest request)
    {
        try
        {
            var result = await service.CreateAsync(User.GetMemberCode(), request);
            return CreatedAtAction(nameof(Get), new { id = result.Id }, ApiResponse<QrCodeDetailDto>.Ok(result, "บันทึกแล้ว"));
        }
        catch (QrCodeValidationException ex)
        {
            return BadRequest(ApiResponse<QrCodeDetailDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<QrCodeDetailDto>>> Update(int id, [FromBody] QrCodeSaveRequest request)
    {
        try
        {
            var result = await service.UpdateAsync(id, User.GetMemberCode(), request);
            return result is null
                ? NotFound(ApiResponse<QrCodeDetailDto>.Fail("ไม่พบ QR Code"))
                : Ok(ApiResponse<QrCodeDetailDto>.Ok(result, "บันทึกแล้ว"));
        }
        catch (QrCodeValidationException ex)
        {
            return BadRequest(ApiResponse<QrCodeDetailDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        return await service.DeleteAsync(id, User.GetMemberCode())
            ? Ok(ApiResponse<object>.Ok(new { id }, "ลบแล้ว"))
            : NotFound(ApiResponse<object>.Fail("ไม่พบ QR Code"));
    }
}
