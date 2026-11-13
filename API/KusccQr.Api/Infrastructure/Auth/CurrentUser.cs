// File: API/KusccQr.Api/Infrastructure/Auth/CurrentUser.cs
// Version: 1.0.0
// Description: Helper อ่านข้อมูลผู้ใช้จาก claims ของ SSO token (MemberCode, Name, MemberType)
using System.Security.Claims;

namespace KusccQr.Api.Infrastructure.Auth;

public static class CurrentUser
{
    public const string MemberCodeClaim = "MemberCode";
    public const string NameClaim = "Name";
    public const string MemberTypeClaim = "MemberType";

    // รหัสสมาชิก 6 หลัก (เติม 0 ข้างหน้า) — ใช้เป็นเจ้าของ QR
    public static string GetMemberCode(this ClaimsPrincipal user) =>
        (user.FindFirstValue(MemberCodeClaim) ?? string.Empty).Trim().PadLeft(6, '0');

    public static string? GetDisplayName(this ClaimsPrincipal user) => user.FindFirstValue(NameClaim);

    public static bool IsSsoAdmin(this ClaimsPrincipal user) =>
        string.Equals(user.FindFirstValue(MemberTypeClaim), "admin", StringComparison.OrdinalIgnoreCase);
}
