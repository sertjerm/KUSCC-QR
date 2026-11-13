// File: Client/src/api/qrApi.js
// Version: 1.0.0
// Description: ฟังก์ชันเรียก API ทั้งหมดของแอป (ดูสัญญาที่ docs/API_SPEC.md) — คืนค่า data ของ ApiResponse
import apiClient from '../utils/apiClient.js'

export const getLookups = () => apiClient.get('/lookups')

export const getBrandPresets = () => apiClient.get('/brand-presets')

export const listQrCodes = ({ search, page = 1, pageSize = 20 } = {}) =>
  apiClient.get('/qr-codes', { params: { search: search || undefined, page, pageSize } })

export const getQrCode = (id) => apiClient.get(`/qr-codes/${id}`)

export const createQrCode = (payload) => apiClient.post('/qr-codes', payload)

export const updateQrCode = (id, payload) => apiClient.put(`/qr-codes/${id}`, payload)

export const deleteQrCode = (id) => apiClient.delete(`/qr-codes/${id}`)
