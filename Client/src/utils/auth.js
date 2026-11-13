// File: Client/src/utils/auth.js
// Version: 1.0.0
// Description: SSO Auth utility ตามกติกาใน SSO_INTEGRATION_GUIDE — ตรวจ exp ก่อนใช้ token, ล้างเฉพาะ auth keys,
//              refresh token, logout แบบ revoke + logout=true

export const SSO_BASE_URL = 'https://apps4.coop.ku.ac.th/kusccsso'
export const SSO_LOGIN_URL = `${SSO_BASE_URL}/login`
const SSO_API_URL = `${SSO_BASE_URL}/api`

export const APP_ID = import.meta.env.VITE_APP_ID || 'KUSCC-QR'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'KUSCC QR Studio'

const AUTH_KEYS = ['sso_token', 'sso_user']

export const getSSOToken = () => localStorage.getItem('sso_token')

export const getSSOUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sso_user') || 'null')
  } catch {
    return null
  }
}

// ตรวจ exp ฝั่ง browser (เผื่อ 60 วินาที) — ใช้แก้ UX เท่านั้น backend ตรวจซ้ำเสมอ
export const isJwtUsable = (token, skewSeconds = 60) => {
  try {
    const payloadPart = token?.split('.')[1]
    if (!payloadPart) return false
    const base64 = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=')
    const payload = JSON.parse(atob(base64))
    return Number(payload.exp) * 1000 > Date.now() + skewSeconds * 1000
  } catch {
    return false
  }
}

export const clearLocalAuth = () => {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

const buildSsoUrl = (extraParams = {}) => {
  const params = new URLSearchParams({
    ...extraParams,
    returnUrl: window.location.href,
    appId: APP_ID,
    appName: APP_NAME,
  })
  return `${SSO_LOGIN_URL}?${params}`
}

export const redirectToLogin = () => {
  clearLocalAuth()
  window.location.assign(buildSsoUrl())
}

// รับ token จาก callback (?sso_token=&sso_user=) แล้วล้าง URL — คืน user หรือ null ถ้ายังไม่ login
export const consumeSsoCallback = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const urlToken = urlParams.get('sso_token')
  const urlUser = urlParams.get('sso_user')
  if (!urlToken || !urlUser) return

  localStorage.setItem('sso_token', urlToken)
  localStorage.setItem('sso_user', urlUser)
  urlParams.delete('sso_token')
  urlParams.delete('sso_user')
  const query = urlParams.toString()
  window.history.replaceState({}, document.title, window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
}

// คืน token ใหม่ถ้า refresh สำเร็จ, null ถ้าไม่ได้
export const tryRefreshToken = async () => {
  const token = getSSOToken()
  if (!token) return null
  try {
    const res = await fetch(`${SSO_API_URL}/Auth/refresh-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const newToken = data.token
    if (!newToken) return null
    localStorage.setItem('sso_token', newToken)
    if (data.user) {
      localStorage.setItem('sso_user', typeof data.user === 'string' ? data.user : JSON.stringify(data.user))
    }
    return newToken
  } catch {
    return null
  }
}

// ใช้ทั้งปุ่ม "ออกจากระบบ" และ "เปลี่ยนผู้ใช้" — revoke token แบบ best-effort แล้วให้ SSO ล้าง session กลาง
export const logout = async () => {
  const token = getSSOToken()
  if (token) {
    try {
      await fetch(`${SSO_API_URL}/Auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // best-effort
    }
  }
  clearLocalAuth()
  window.location.assign(buildSsoUrl({ logout: 'true' }))
}
