// File: Client/src/routes/AppRoutes.jsx
// Version: 1.0.0
// Description: ตาราง route ของแอป — ทุกหน้าต้อง login ผ่าน SSO
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import DesignerPage from '../modules/designer/pages/DesignerPage.jsx'
import MyQrPage from '../modules/library/pages/MyQrPage.jsx'

const AppRoutes = () => (
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/designer" replace />} />
        <Route path="/designer" element={<DesignerPage />} />
        <Route path="/designer/:id" element={<DesignerPage />} />
        <Route path="/my-qr" element={<MyQrPage />} />
        <Route path="*" element={<Navigate to="/designer" replace />} />
      </Route>
    </Route>
  </Routes>
)

export default AppRoutes
