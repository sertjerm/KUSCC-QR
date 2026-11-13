// File: API/KusccQr.Api/Infrastructure/Data/DbConnectionFactory.cs
// Version: 1.0.0
// Description: สร้าง connection MSSQL จาก ConnectionStrings:DefaultConnection — Repository ทุกตัวใช้ผ่าน interface นี้
using System.Data;
using Microsoft.Data.SqlClient;

namespace KusccQr.Api.Infrastructure.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}

public sealed class SqlConnectionFactory(IConfiguration configuration) : IDbConnectionFactory
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection") ?? string.Empty;

    public IDbConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("ยังไม่ได้ตั้งค่า ConnectionStrings:DefaultConnection");
        }
        return new SqlConnection(_connectionString);
    }
}
