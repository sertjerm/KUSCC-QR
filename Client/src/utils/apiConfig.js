// File: Client/src/utils/apiConfig.js
// Version: 1.0.0
// Description: Single source of truth ของ API base URL — local ใช้ VITE_API_PORT (มาจาก ports.env), production ใช้ /kuscc-qr/api

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const apiPort = import.meta.env.VITE_API_PORT || '5250'

export const API_BASE_URL = isLocal ? `http://localhost:${apiPort}` : '/kuscc-qr/api'
