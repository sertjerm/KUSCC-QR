// File: API/KusccQr.Api/Modules/BrandPresets/BrandPresetModule.cs
// Version: 1.0.0
// Description: Brand preset ขององค์กร (สี/โลโก้/รูปทรงสำเร็จรูป) — ตอนนี้อ่านอย่างเดียว, หน้า admin CRUD อยู่ใน Phase 2
using System.Text.Json;
using Dapper;
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace KusccQr.Api.Modules.BrandPresets.Interfaces
{
    public sealed class BrandPresetEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string StyleJson { get; set; } = "{}";
        public int SortOrder { get; set; }
    }

    public sealed class BrandPresetDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public JsonElement Style { get; set; }
        public int SortOrder { get; set; }
    }

    public interface IBrandPresetRepository
    {
        Task<IReadOnlyList<BrandPresetEntity>> ListActiveAsync();
    }

    public interface IBrandPresetService
    {
        Task<IReadOnlyList<BrandPresetDto>> ListActiveAsync();
    }
}

namespace KusccQr.Api.Modules.BrandPresets.Repositories
{
    using KusccQr.Api.Modules.BrandPresets.Interfaces;

    public sealed class BrandPresetRepository(IDbConnectionFactory connectionFactory) : IBrandPresetRepository
    {
        public async Task<IReadOnlyList<BrandPresetEntity>> ListActiveAsync()
        {
            const string sql = @"
                SELECT id AS Id, name AS Name, description AS Description,
                       style_json AS StyleJson, sort_order AS SortOrder
                FROM dbo.kuscc_qr_brand_presets
                WHERE is_active = 1
                ORDER BY sort_order, id;";
            using var connection = connectionFactory.CreateConnection();
            return (await connection.QueryAsync<BrandPresetEntity>(sql)).ToList();
        }
    }
}

namespace KusccQr.Api.Modules.BrandPresets.Services
{
    using KusccQr.Api.Modules.BrandPresets.Interfaces;

    public sealed class BrandPresetService(IBrandPresetRepository repository) : IBrandPresetService
    {
        public async Task<IReadOnlyList<BrandPresetDto>> ListActiveAsync()
        {
            var rows = await repository.ListActiveAsync();
            return rows.Select(r =>
            {
                using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(r.StyleJson) ? "{}" : r.StyleJson);
                return new BrandPresetDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Description = r.Description,
                    Style = document.RootElement.Clone(),
                    SortOrder = r.SortOrder
                };
            }).ToList();
        }
    }
}

namespace KusccQr.Api.Modules.BrandPresets.Controllers
{
    using KusccQr.Api.Modules.BrandPresets.Interfaces;

    [ApiController]
    [Route("brand-presets")]
    public sealed class BrandPresetsController(IBrandPresetService service) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<BrandPresetDto>>>> List() =>
            Ok(ApiResponse<IReadOnlyList<BrandPresetDto>>.Ok(await service.ListActiveAsync()));
    }
}
