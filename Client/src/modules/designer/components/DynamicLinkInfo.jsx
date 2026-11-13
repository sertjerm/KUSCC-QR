// File: Client/src/modules/designer/components/DynamicLinkInfo.jsx
// Version: 1.0.0
// Description: แสดงข้อมูล Dynamic link ที่บันทึกแล้ว — ลิงก์สั้น (คัดลอกได้), ปลายทางปัจจุบัน, จำนวน/เวลาการสแกนล่าสุด
import { Alert, Descriptions, Typography } from 'antd'

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('th-TH') : 'ยังไม่มีการสแกน')

const DynamicLinkInfo = ({ link, currentTarget }) => (
  <>
    <Descriptions
      className="!mt-3"
      size="small"
      column={1}
      bordered
      items={[
        {
          key: 'shortUrl',
          label: 'ลิงก์ใน QR',
          children: <Typography.Text copyable={{ text: link.shortUrl }} className="break-all">{link.shortUrl}</Typography.Text>,
        },
        {
          key: 'target',
          label: 'ปลายทางที่บันทึก',
          children: <Typography.Text className="break-all">{link.targetUrl}</Typography.Text>,
        },
        { key: 'scanCount', label: 'สแกนแล้ว', children: `${link.scanCount.toLocaleString()} ครั้ง` },
        { key: 'lastScannedAt', label: 'สแกนล่าสุด', children: formatDateTime(link.lastScannedAt) },
      ]}
    />
    {currentTarget && currentTarget !== link.targetUrl && (
      <Alert className="!mt-3" type="warning" showIcon title="ปลายทางเปลี่ยนแล้ว — กดบันทึกเพื่อให้ QR พาไปลิงก์ใหม่" />
    )}
  </>
)

export default DynamicLinkInfo
