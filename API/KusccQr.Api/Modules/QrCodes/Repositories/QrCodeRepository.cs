// File: API/KusccQr.Api/Modules/QrCodes/Repositories/QrCodeRepository.cs
// Version: 1.1.0
// Description: เข้าถึงตาราง dbo.kuscc_qr_codes / dbo.kuscc_qr_scans ด้วย Dapper — ลบแบบ soft delete (is_deleted = 1)
//              short_code ชนกัน (unique index) → โยน SqlException 2601/2627 ให้ Service สุ่มใหม่
using Dapper;
using KusccQr.Api.Infrastructure.Data;
using KusccQr.Api.Modules.QrCodes.DTOs;
using KusccQr.Api.Modules.QrCodes.Interfaces;

namespace KusccQr.Api.Modules.QrCodes.Repositories;

public sealed class QrCodeRepository(IDbConnectionFactory connectionFactory) : IQrCodeRepository
{
    private const string SelectColumns = @"
        id                 AS Id,
        owner_member_code  AS OwnerMemberCode,
        name               AS Name,
        qr_type            AS QrType,
        content            AS Content,
        data_json          AS DataJson,
        style_json         AS StyleJson,
        thumbnail_data_url AS ThumbnailDataUrl,
        is_dynamic         AS IsDynamic,
        short_code         AS ShortCode,
        target_url         AS TargetUrl,
        scan_count         AS ScanCount,
        last_scanned_at    AS LastScannedAt,
        created_at         AS CreatedAt,
        updated_at         AS UpdatedAt";

    public async Task<(IReadOnlyList<QrCodeEntity> Items, int Total)> ListAsync(
        string ownerMemberCode, string? search, int page, int pageSize)
    {
        const string where = @"
            WHERE owner_member_code = @OwnerMemberCode AND is_deleted = 0
              AND (@Search IS NULL OR name LIKE @Search OR content LIKE @Search OR target_url LIKE @Search)";
        var sql = $@"
            SELECT COUNT(*) FROM dbo.kuscc_qr_codes {where};

            SELECT {SelectColumns} FROM dbo.kuscc_qr_codes {where}
            ORDER BY updated_at DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var connection = connectionFactory.CreateConnection();
        using var grid = await connection.QueryMultipleAsync(sql, new
        {
            OwnerMemberCode = ownerMemberCode,
            Search = string.IsNullOrWhiteSpace(search) ? null : $"%{search.Trim()}%",
            Offset = (page - 1) * pageSize,
            PageSize = pageSize
        });
        var total = await grid.ReadSingleAsync<int>();
        var items = (await grid.ReadAsync<QrCodeEntity>()).ToList();
        return (items, total);
    }

    public async Task<QrCodeEntity?> GetAsync(int id, string ownerMemberCode)
    {
        var sql = $@"SELECT {SelectColumns} FROM dbo.kuscc_qr_codes
                     WHERE id = @Id AND owner_member_code = @OwnerMemberCode AND is_deleted = 0";
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<QrCodeEntity>(sql, new { Id = id, OwnerMemberCode = ownerMemberCode });
    }

    public async Task<int> InsertAsync(QrCodeEntity entity, string actor)
    {
        const string sql = @"
            INSERT INTO dbo.kuscc_qr_codes
                (owner_member_code, name, qr_type, content, data_json, style_json, thumbnail_data_url,
                 is_dynamic, short_code, target_url, created_by, updated_by)
            OUTPUT INSERTED.id
            VALUES
                (@OwnerMemberCode, @Name, @QrType, @Content, @DataJson, @StyleJson, @ThumbnailDataUrl,
                 @IsDynamic, @ShortCode, @TargetUrl, @Actor, @Actor);";
        using var connection = connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            entity.OwnerMemberCode, entity.Name, entity.QrType, entity.Content,
            entity.DataJson, entity.StyleJson, entity.ThumbnailDataUrl,
            entity.IsDynamic, entity.ShortCode, entity.TargetUrl, Actor = actor
        });
    }

    public async Task<bool> UpdateAsync(QrCodeEntity entity, string actor)
    {
        // short_code ตั้งได้ครั้งเดียว (COALESCE คงค่าเดิมไว้เสมอ) — ลิงก์ที่พิมพ์ไปแล้วต้องไม่เปลี่ยน
        const string sql = @"
            UPDATE dbo.kuscc_qr_codes SET
                name = @Name, qr_type = @QrType, content = @Content,
                data_json = @DataJson, style_json = @StyleJson, thumbnail_data_url = @ThumbnailDataUrl,
                is_dynamic = @IsDynamic, short_code = COALESCE(short_code, @ShortCode), target_url = @TargetUrl,
                updated_at = SYSDATETIME(), updated_by = @Actor
            WHERE id = @Id AND owner_member_code = @OwnerMemberCode AND is_deleted = 0;";
        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new
        {
            entity.Id, entity.OwnerMemberCode, entity.Name, entity.QrType, entity.Content,
            entity.DataJson, entity.StyleJson, entity.ThumbnailDataUrl,
            entity.IsDynamic, entity.ShortCode, entity.TargetUrl, Actor = actor
        });
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int id, string ownerMemberCode, string actor)
    {
        const string sql = @"
            UPDATE dbo.kuscc_qr_codes SET is_deleted = 1, updated_at = SYSDATETIME(), updated_by = @Actor
            WHERE id = @Id AND owner_member_code = @OwnerMemberCode AND is_deleted = 0;";
        using var connection = connectionFactory.CreateConnection();
        return await connection.ExecuteAsync(sql, new { Id = id, OwnerMemberCode = ownerMemberCode, Actor = actor }) > 0;
    }

    public async Task<(int Id, string TargetUrl)?> FindRedirectAsync(string shortCode)
    {
        const string sql = @"
            SELECT id AS Id, target_url AS TargetUrl FROM dbo.kuscc_qr_codes
            WHERE short_code = @ShortCode AND is_dynamic = 1 AND is_deleted = 0 AND target_url IS NOT NULL;";
        using var connection = connectionFactory.CreateConnection();
        var row = await connection.QuerySingleOrDefaultAsync<RedirectRow>(sql, new { ShortCode = shortCode });
        return row is null ? null : (row.Id, row.TargetUrl);
    }

    public async Task RecordScanAsync(int qrCodeId, string? userAgent)
    {
        const string sql = @"
            UPDATE dbo.kuscc_qr_codes SET scan_count = scan_count + 1, last_scanned_at = SYSDATETIME()
            WHERE id = @Id;
            INSERT INTO dbo.kuscc_qr_scans (qr_code_id, user_agent) VALUES (@Id, @UserAgent);";
        using var connection = connectionFactory.CreateConnection();
        await connection.ExecuteAsync(sql, new { Id = qrCodeId, UserAgent = userAgent });
    }

    private sealed class RedirectRow
    {
        public int Id { get; set; }
        public string TargetUrl { get; set; } = string.Empty;
    }
}
