// File: Client/src/main.jsx
// Version: 1.0.0
// Description: จุดเริ่มต้นของ React app — ตั้งธีม AntD (ภาษาไทย, สีองค์กร) และ Router
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'
import './index.css'
import AppRoutes from './routes/AppRoutes.jsx'

const THEME = {
  token: {
    colorPrimary: '#0b6e4f',
    borderRadius: 10,
    fontFamily: '"Noto Sans Thai", "Sarabun", system-ui, sans-serif',
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider locale={thTH} theme={THEME}>
      <AntApp>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
