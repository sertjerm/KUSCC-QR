// File: Client/src/modules/designer/utils/qrContent.js
// Version: 1.0.0
// Description: แปลงค่าที่กรอกในฟอร์ม (data) เป็นข้อความที่ encode ลง QR ตามมาตรฐานของแต่ละประเภท

// Wi-Fi: escape \ ; , : " ตามสเปก ZXing
const escapeWifi = (value = '') => String(value).replace(/([\\;,:"])/g, '\\$1')

// vCard 3.0: escape \ , ; และขึ้นบรรทัดใหม่
const escapeVCard = (value = '') =>
  String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n')

const BUILDERS = {
  url: ({ url = '' }) => url.trim(),

  text: ({ text = '' }) => text,

  tel: ({ phone = '' }) => (phone.trim() ? `tel:${phone.replace(/[^\d+]/g, '')}` : ''),

  email: ({ to = '', subject = '', body = '' }) => {
    if (!to.trim()) return ''
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (body) params.set('body', body)
    const query = params.toString().replace(/\+/g, '%20')
    return `mailto:${to.trim()}${query ? `?${query}` : ''}`
  },

  wifi: ({ ssid = '', password = '', encryption = 'WPA', hidden = false }) => {
    if (!ssid) return ''
    const parts = [`T:${encryption}`, `S:${escapeWifi(ssid)}`]
    if (encryption !== 'nopass') parts.push(`P:${escapeWifi(password)}`)
    if (hidden) parts.push('H:true')
    return `WIFI:${parts.join(';')};;`
  },

  vcard: (d) => {
    const firstName = d.firstName || ''
    const lastName = d.lastName || ''
    if (!firstName && !lastName && !d.org) return ''
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
      `FN:${escapeVCard(`${firstName} ${lastName}`.trim() || d.org)}`,
      d.org && `ORG:${escapeVCard(d.org)}`,
      d.title && `TITLE:${escapeVCard(d.title)}`,
      d.mobile && `TEL;TYPE=CELL:${escapeVCard(d.mobile)}`,
      d.phone && `TEL;TYPE=WORK,VOICE:${escapeVCard(d.phone)}`,
      d.email && `EMAIL;TYPE=INTERNET:${escapeVCard(d.email)}`,
      d.website && `URL:${escapeVCard(d.website)}`,
      d.address && `ADR;TYPE=WORK:;;${escapeVCard(d.address)};;;;`,
      'END:VCARD',
    ]
    return lines.filter(Boolean).join('\n')
  },
}

export const buildQrContent = (qrType, data = {}) => (BUILDERS[qrType] ? BUILDERS[qrType](data) : '')

// ค่าเริ่มต้นของฟอร์มแต่ละประเภท
export const DEFAULT_DATA = {
  url: { url: 'https://www.kuscc.com' },
  text: { text: '' },
  tel: { phone: '' },
  email: { to: '', subject: '', body: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
  vcard: { firstName: '', lastName: '', org: 'สหกรณ์ออมทรัพย์มหาวิทยาลัยเกษตรศาสตร์ จำกัด', title: '', mobile: '', phone: '', email: '', website: '', address: '' },
}

// QR version 40 + ECL L รับได้ราว 2,953 bytes (ECL H น้อยกว่านั้นมาก)
export const MAX_CONTENT_BYTES = 2953

export const getByteLength = (text) => new TextEncoder().encode(text || '').length
