// File: API/KusccQr.Api/Program.cs
// Version: 1.1.0
// Description: Entry point ของ KUSCC-QR API — ลงทะเบียน Services, SSO Authentication และ Middleware
using System.Text.Json;
using KusccQr.Api.Common.DTOs;
using KusccQr.Api.Infrastructure.Auth;
using KusccQr.Api.Infrastructure.Data;
using KusccQr.Api.Modules.BrandPresets.Interfaces;
using KusccQr.Api.Modules.BrandPresets.Repositories;
using KusccQr.Api.Modules.BrandPresets.Services;
using KusccQr.Api.Modules.Lookups.Services;
using KusccQr.Api.Modules.QrCodes.Interfaces;
using KusccQr.Api.Modules.QrCodes.Repositories;
using KusccQr.Api.Modules.QrCodes.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Authorization;

var builder = WebApplication.CreateBuilder(args);

// ค่าลับเฉพาะเครื่อง (เช่น connection string) — ไฟล์นี้อยู่ใน .gitignore
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// ---------- Controllers + JSON (camelCase ตาม API Wire Contract) ----------
builder.Services
    .AddControllers(options =>
    {
        // Fail closed: ทุก controller ต้องมี SSO token ที่ verify ผ่าน ยกเว้นที่ติด [AllowAnonymous]
        var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        options.Filters.Add(new AuthorizeFilter(policy));
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // ให้ 400 จาก model validation ใช้รูปแบบ ApiResponse เดียวกับทุก endpoint
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .SelectMany(entry => entry.Value!.Errors.Select(e =>
                    string.IsNullOrEmpty(entry.Key) ? e.ErrorMessage : $"{JsonNamingPolicy.CamelCase.ConvertName(entry.Key)}: {e.ErrorMessage}"))
                .ToList();
            return new BadRequestObjectResult(ApiResponse<object>.Fail("ข้อมูลไม่ถูกต้อง", errors));
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

// ---------- SSO Authentication (verify-token แบบ server-to-server) ----------
builder.Services.AddHttpClient(SsoAuthenticationHandler.HttpClientName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = SsoAuthenticationHandler.SchemeName;
        options.DefaultChallengeScheme = SsoAuthenticationHandler.SchemeName;
    })
    .AddScheme<AuthenticationSchemeOptions, SsoAuthenticationHandler>(SsoAuthenticationHandler.SchemeName, null);
builder.Services.AddAuthorization();

// ---------- Infrastructure ----------
builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();

// ---------- Modules: Controller → Service → Repository ----------
builder.Services.Configure<DynamicLinkOptions>(builder.Configuration.GetSection(DynamicLinkOptions.SectionName));
builder.Services.AddScoped<IQrCodeRepository, QrCodeRepository>();
builder.Services.AddScoped<IQrCodeService, QrCodeService>();
builder.Services.AddScoped<IBrandPresetRepository, BrandPresetRepository>();
builder.Services.AddScoped<IBrandPresetService, BrandPresetService>();
builder.Services.AddSingleton<ILookupService, LookupService>();

// ---------- CORS (เฉพาะ origin ที่กำหนดใน appsettings) ----------
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientOrigins", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// error ที่ไม่ได้ดักไว้ → ตอบ ApiResponse JSON (Client อ่าน message ได้) — แสดงรายละเอียดเฉพาะ Development
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    var message = app.Environment.IsDevelopment() && exception is not null
        ? $"เกิดข้อผิดพลาดภายในระบบ: {exception.Message}"
        : "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่หรือติดต่อผู้ดูแล";
    await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message));
}));

if (app.Environment.IsDevelopment() && app.Configuration.GetValue("Sso:DevBypass", false))
{
    app.Logger.LogWarning("⚠️ โหมดทดสอบ (Sso:DevBypass) เปิดอยู่ — รับ token ปลอมจาก localhost ได้");
}

// Swagger เปิดเฉพาะเครื่องพัฒนา — ใช้ relative path ไม่ hardcode host
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("../swagger/v1/swagger.json", "KUSCC-QR API v1"));
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("ClientOrigins");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.Now }))
   .AllowAnonymous()
   .WithName("HealthCheck");

app.MapControllers();

app.Run();
