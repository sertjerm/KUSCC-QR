// File: API/KusccQr.Api/Infrastructure/Auth/SsoAuthenticationHandler.cs
// Version: 1.1.0
// Description: ตรวจ Bearer token กับ KUSCC-SSO (GET /Auth/verify-token) แล้วสร้าง ClaimsPrincipal
//              cache ผลตรวจไว้สั้น ๆ (ตาม Sso:VerifyCacheSeconds) เพื่อลดการยิง SSO ทุก request
//              โหมดทดสอบ (Sso:DevBypass) รับ token ปลอมได้ — ทำงานเฉพาะ Development + request จากเครื่องตัวเองเท่านั้น
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace KusccQr.Api.Infrastructure.Auth;

public sealed class SsoAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "KusccSso";
    public const string HttpClientName = "KusccSso";
    private const string DefaultVerifyUrl = "https://apps4.coop.ku.ac.th/kusccsso/api/Auth/verify-token";

    // ต้องตรงกับ DEV_BYPASS_TOKEN ใน Client/src/utils/auth.js (JWT ปลอม exp ปี 2100)
    public const string DevBypassToken = "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.dev-bypass";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly IHostEnvironment _environment;

    public SsoAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        IHostEnvironment environment)
        : base(options, logger, encoder)
    {
        _environment = environment;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _cache = cache;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!AuthenticationHeaderValue.TryParse(Request.Headers.Authorization, out var authorization) ||
            !string.Equals(authorization.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(authorization.Parameter))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authorization.Parameter;

        if (token == DevBypassToken)
        {
            return IsDevBypassAllowed()
                ? AuthenticateResult.Success(CreateDevBypassTicket())
                : AuthenticateResult.Fail("Dev bypass token is not allowed here.");
        }
        var cacheKey = "sso:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

        if (!_cache.TryGetValue(cacheKey, out List<Claim>? claims) || claims is null)
        {
            try
            {
                claims = await VerifyWithSsoAsync(token);
            }
            catch (OperationCanceledException) when (Context.RequestAborted.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                Logger.LogError(exception, "SSO verify-token ไม่สำเร็จ (SSO ไม่ตอบหรือ network error)");
                return AuthenticateResult.Fail("SSO authentication is temporarily unavailable.");
            }

            if (claims is null)
            {
                return AuthenticateResult.Fail("The SSO token is invalid or expired.");
            }

            var cacheSeconds = _configuration.GetValue("Sso:VerifyCacheSeconds", 60);
            _cache.Set(cacheKey, claims, TimeSpan.FromSeconds(cacheSeconds));
        }

        if (claims.All(c => c.Type != CurrentUser.MemberCodeClaim || string.IsNullOrWhiteSpace(c.Value)))
        {
            return AuthenticateResult.Fail("The SSO token does not contain MemberCode.");
        }

        var identity = new ClaimsIdentity(claims, SchemeName, CurrentUser.NameClaim, ClaimTypes.Role);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }

    // 3 ชั้น: environment = Development, เปิด Sso:DevBypass, และ request มาจาก loopback เท่านั้น
    private bool IsDevBypassAllowed() =>
        _environment.IsDevelopment() &&
        _configuration.GetValue("Sso:DevBypass", false) &&
        Context.Connection.RemoteIpAddress is { } ip && System.Net.IPAddress.IsLoopback(ip);

    private AuthenticationTicket CreateDevBypassTicket()
    {
        var claims = new List<Claim>
        {
            new(CurrentUser.MemberCodeClaim, _configuration["Sso:DevBypassMemberCode"] ?? "999999"),
            new(CurrentUser.NameClaim, "ผู้ทดสอบ (โหมดทดสอบ)"),
            new(CurrentUser.MemberTypeClaim, "member"),
        };
        var identity = new ClaimsIdentity(claims, SchemeName, CurrentUser.NameClaim, ClaimTypes.Role);
        return new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
    }

    // คืน null เมื่อ token ใช้ไม่ได้, throw เมื่อเรียก SSO ไม่สำเร็จ
    private async Task<List<Claim>?> VerifyWithSsoAsync(string token)
    {
        var verifyUrl = _configuration["Sso:VerifyTokenUrl"] ?? DefaultVerifyUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, verifyUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var response = await client.SendAsync(request, Context.RequestAborted);
        if (!response.IsSuccessStatusCode) return null;

        await using var content = await response.Content.ReadAsStreamAsync(Context.RequestAborted);
        using var document = await JsonDocument.ParseAsync(content, cancellationToken: Context.RequestAborted);
        var root = document.RootElement;
        if (!root.TryGetProperty("valid", out var valid) || valid.ValueKind != JsonValueKind.True) return null;

        var claims = new List<Claim>();
        if (root.TryGetProperty("claims", out var claimElements) && claimElements.ValueKind == JsonValueKind.Array)
        {
            foreach (var element in claimElements.EnumerateArray())
            {
                if (element.TryGetProperty("type", out var type) &&
                    element.TryGetProperty("value", out var value) &&
                    type.GetString() is { Length: > 0 } typeText &&
                    value.GetString() is { } valueText)
                {
                    claims.Add(new Claim(typeText, valueText));
                }
            }
        }
        return claims;
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        await Response.WriteAsJsonAsync(
            new { success = false, message = "A valid KUSCC SSO Bearer token is required.", data = (object?)null, errors = new[] { "unauthorized" } },
            Context.RequestAborted);
    }

    protected override async Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        await Response.WriteAsJsonAsync(
            new { success = false, message = "You do not have permission to access this resource.", data = (object?)null, errors = new[] { "forbidden" } },
            Context.RequestAborted);
    }
}
