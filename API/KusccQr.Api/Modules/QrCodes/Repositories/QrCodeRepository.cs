// File: API/KusccQr.Api/Modules/QrCodes/Repositories/QrCodeRepository.cs
// Version: 1.0.0
// Description: เข้าถึงตาราง dbo.kuscc_qr_codes ด้วย Dapper — ลบแบบ soft delete (is_deleted = 1)
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
        created_at         AS CreatedAt,
        updated_at         AS UpdatedAt";

    public async Task<(IReadOnlyList<QrCodeEntity> Items, int Total)> ListAsync(
        string ownerMemberCode, string? search, int page, int pageSize)
    {
        var sql = $@"
            SELECT COUNT(*) FROM dbo.kuscc_qr_codes
            WHERE owner_member_code = @OwnerMemberCode AND is_deleted = 0
              AND (@Search IS NULL OR name LIKE @Search OR content LIKE @Search);

            SELECT {SelectColumns} FROM dbo.kuscc_qr_codes
            WHERE owner_member_code = @OwnerMemberCode AND is_deleted = 0
              AND (@Search IS NULL OR name LIKE @Search OR content LIKE @Search)
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
                (owner_member_code, name, qr_type, content, data_json, style_json, thumbnail_data_url, created_by, updated_by)
            OUTPUT INSERTED.id
            VALUES
                (@OwnerMemberCode, @Name, @QrType, @Content, @DataJson, @StyleJson, @ThumbnailDataUrl, @Actor, @Actor);";
        using var connection = connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            entity.OwnerMemberCode, entity.Name, entity.QrType, entity.Content,
            entity.DataJson, entity.StyleJson, entity.ThumbnailDataUrl, Actor = actor
        });
    }

    public async Task<bool> UpdateAsync(QrCodeEntity entity, string actor)
    {
        const string sql = @"
            UPDATE dbo.kuscc_qr_codes SET
                name = @Name, qr_type = @QrType, content = @Content,
                data_json = @DataJson, style_json = @StyleJson, thumbnail_data_url = @ThumbnailDataUrl,
                updated_at = SYSDATETIME(), updated_by = @Actor
            WHERE id = @Id AND owner_member_code = @OwnerMemberCode AND is_deleted = 0;";
        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new
        {
            entity.Id, entity.OwnerMemberCode, entity.Name, entity.QrType, entity.Content,
            entity.DataJson, entity.StyleJson, entity.ThumbnailDataUrl, Actor = actor
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
}
