// File: Client/src/modules/designer/utils/qrStyle.js
// Version: 1.0.0
// Description: ค่า style เริ่มต้น (รูปแบบ options ของ qr-code-styling), แปลงเป็น options สำหรับ render/export,
//              ตรวจ contrast สี และ helper อ่านไฟล์โลโก้

// style = options ของ qr-code-styling ยกเว้น data/width/height (บันทึกลง DB เป็น style_json)
export const DEFAULT_STYLE = {
  margin: 16,
  qrOptions: { errorCorrectionLevel: 'Q' },
  dotsOptions: { type: 'rounded', color: '#0b6e4f' },
  cornersSquareOptions: { type: 'extra-rounded', color: '#064e3b' },
  cornersDotOptions: { type: 'dot', color: '#064e3b' },
  backgroundOptions: { color: '#ffffff' },
  image: null,
  imageOptions: { imageSize: 0.35, margin: 6, hideBackgroundDots: true, crossOrigin: 'anonymous' },
}

export const PREVIEW_SIZE = 600

// รวม style + content + ขนาด เป็น options ที่ส่งให้ QRCodeStyling
export const toStylingOptions = (style, content, size = PREVIEW_SIZE, type = 'canvas') => ({
  ...style,
  type,
  width: size,
  height: size,
  data: content || ' ',
  image: style.image || undefined,
  // margin เก็บเทียบกับภาพ 600px — ขยายตามขนาดจริงเพื่อให้สัดส่วนเท่าเดิม
  margin: Math.round(((style.margin ?? 0) * size) / PREVIEW_SIZE),
})

// merge แบบลึก 1 ชั้น (พอสำหรับโครง options ของ qr-code-styling)
export const mergeStyle = (base, patch) => {
  const result = { ...base }
  for (const [key, value] of Object.entries(patch || {})) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object'
      ? { ...base[key], ...value }
      : value
  }
  return result
}

// ---------- Contrast (WCAG relative luminance) ----------
const hexToRgb = (hex) => {
  const clean = String(hex || '').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return null
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastRatio = (foreground, background) => {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  if (!fg || !bg) return null
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

// คืนข้อความเตือนถ้า QR อาจสแกนยาก
export const getScanWarnings = (style) => {
  const warnings = []
  const background = style.backgroundOptions?.color
  const dotColors = style.dotsOptions?.gradient
    ? style.dotsOptions.gradient.colorStops.map((s) => s.color)
    : [style.dotsOptions?.color]

  if (!background || background === 'transparent') {
    warnings.push('พื้นหลังโปร่งใส — ต้องวาง QR บนพื้นสีอ่อนเท่านั้น')
  } else {
    const worst = Math.min(...dotColors.map((c) => contrastRatio(c, background) ?? 21))
    if (worst < 3) warnings.push(`สีจุดกับพื้นหลังตัดกันน้อย (${worst.toFixed(1)}:1) ควรไม่ต่ำกว่า 3:1`)
    const bgLum = hexToRgb(background) ? luminance(hexToRgb(background)) : 1
    const dotLum = hexToRgb(dotColors[0]) ? luminance(hexToRgb(dotColors[0])) : 0
    if (dotLum > bgLum) warnings.push('จุดสีอ่อนกว่าพื้นหลัง (inverted) — แอปสแกนบางตัวอ่านไม่ได้')
  }
  if (style.image && (style.imageOptions?.imageSize ?? 0) > 0.4) {
    warnings.push('โลโก้ใหญ่เกิน 40% อาจทำให้สแกนไม่ติด')
  }
  if (style.image && style.qrOptions?.errorCorrectionLevel !== 'H') {
    warnings.push('มีโลโก้ — แนะนำระดับแก้ผิด H')
  }
  return warnings
}

export const MAX_LOGO_BYTES = 500 * 1024

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const blobToDataUrl = fileToDataUrl
