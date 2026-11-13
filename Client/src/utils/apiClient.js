// File: Client/src/utils/apiClient.js
// Version: 1.0.0
// Description: axios instance กลาง — แนบ Bearer token, เจอ 401 ลอง refresh 1 ครั้งแล้วค่อย redirect ไป SSO,
//              คืน payload.data ของ ApiResponse ({ success, message, data, errors })
import axios from 'axios'
import { API_BASE_URL } from './apiConfig.js'
import { getSSOToken, redirectToLogin, tryRefreshToken } from './auth.js'

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 })

apiClient.interceptors.request.use((config) => {
  const token = getSSOToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data?.data,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      const newToken = await tryRefreshToken()
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      }
      redirectToLogin()
    }
    const message = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด'
    return Promise.reject(new Error(message))
  },
)

export default apiClient
