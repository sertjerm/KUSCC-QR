// File: Client/src/routes/ProtectedRoute.jsx
// Version: 1.0.0
// Description: ครอบ route ที่ต้อง login — รับ callback จาก SSO, ตรวจ exp, ลอง refresh ก่อน redirect ไปหน้า SSO
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { consumeSsoCallback, getSSOToken, getSSOUser, isJwtUsable, redirectToLogin, tryRefreshToken } from '../utils/auth.js'

const ProtectedRoute = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      consumeSsoCallback()
      const token = getSSOToken()
      if (token && getSSOUser() && isJwtUsable(token)) {
        if (!cancelled) setReady(true)
        return
      }
      // token หมดอายุหรือไม่มี → ลอง refresh (เฉพาะกรณียังมี token) แล้วค่อย redirect
      if (token && (await tryRefreshToken())) {
        if (!cancelled) setReady(true)
        return
      }
      redirectToLogin()
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" description="กำลังตรวจสอบการเข้าสู่ระบบ..." />
      </div>
    )
  }
  return <Outlet />
}

export default ProtectedRoute
