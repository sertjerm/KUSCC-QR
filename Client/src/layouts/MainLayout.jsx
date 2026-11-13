// File: Client/src/layouts/MainLayout.jsx
// Version: 1.1.0
// Description: Layout หลัก — header มีเมนู (สร้าง QR / QR ของฉัน), ชื่อผู้ใช้ และปุ่มออกจากระบบ
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button, Layout, Menu, Tag, Tooltip, Typography } from 'antd'
import { AppstoreOutlined, LogoutOutlined, QrcodeOutlined } from '@ant-design/icons'
import { APP_NAME, getSSOUser, IS_DEV_BYPASS, logout } from '../utils/auth.js'

const { Header, Content } = Layout

const MENU_ITEMS = [
  { key: '/designer', icon: <QrcodeOutlined />, label: <Link to="/designer">สร้าง QR</Link> },
  { key: '/my-qr', icon: <AppstoreOutlined />, label: <Link to="/my-qr">QR ของฉัน</Link> },
]

const MainLayout = () => {
  const { pathname } = useLocation()
  const user = getSSOUser()
  const selectedKey = pathname.startsWith('/my-qr') ? '/my-qr' : '/designer'

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center gap-3 !bg-white !px-4 shadow-sm md:!px-8">
        <Link to="/designer" className="flex shrink-0 items-center gap-2">
          <QrcodeOutlined className="text-2xl !text-[var(--color-brand)]" />
          <span className="hidden text-lg font-semibold text-gray-800 sm:inline">{APP_NAME}</span>
        </Link>
        <Menu mode="horizontal" selectedKeys={[selectedKey]} items={MENU_ITEMS} className="min-w-0 flex-1 border-none" />
        {IS_DEV_BYPASS && <Tag color="orange" className="!m-0">โหมดทดสอบ</Tag>}
        <Typography.Text className="hidden truncate md:inline">{user?.name}</Typography.Text>
        <Tooltip title="ออกจากระบบ / เปลี่ยนผู้ใช้">
          <Button icon={<LogoutOutlined />} onClick={logout} />
        </Tooltip>
      </Header>
      <Content className="mx-auto w-full max-w-7xl p-3 md:p-6">
        <Outlet />
      </Content>
    </Layout>
  )
}

export default MainLayout
