// File: Client/src/modules/designer/components/ExportPanel.jsx
// Version: 1.0.0
// Description: ดาวน์โหลด QR ตามรูปแบบไฟล์/ขนาดที่เลือก และคัดลอกภาพ PNG ลง clipboard
import { useState } from 'react'
import { App, Button, Col, Form, Row, Select, Space } from 'antd'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import QRCodeStyling from 'qr-code-styling'
import { toStylingOptions } from '../utils/qrStyle.js'

const toOptions = (items = []) => items.map((i) => ({ value: i.value, label: i.label }))

// ขนาดภาพเป็นตัวเลือกด้านเทคนิค (ไม่ใช่ข้อมูลธุรกิจ) จึงกำหนดไว้ที่นี่
const EXPORT_SIZES = [512, 1024, 2048, 4096].map((s) => ({ value: s, label: `${s} × ${s} px` }))

const safeFileName = (name) => (name || 'kuscc-qr').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)

const ExportPanel = ({ style, content, name, lookups, disabled }) => {
  const { message } = App.useApp()
  const [format, setFormat] = useState('png')
  const [size, setSize] = useState(1024)
  const [busy, setBusy] = useState(false)

  const buildQr = (extension, exportSize) =>
    new QRCodeStyling(toStylingOptions(style, content, exportSize, extension === 'svg' ? 'svg' : 'canvas'))

  const handleDownload = async () => {
    setBusy(true)
    try {
      await buildQr(format, size).download({ name: safeFileName(name), extension: format })
    } catch (error) {
      message.error(`ดาวน์โหลดไม่สำเร็จ: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    setBusy(true)
    try {
      const blob = await buildQr('png', size).getRawData('png')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      message.success('คัดลอกภาพแล้ว')
    } catch {
      message.error('เบราว์เซอร์นี้ไม่รองรับการคัดลอกรูปภาพ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form layout="vertical" component="div">
      <Row gutter={12}>
        <Col xs={12}>
          <Form.Item label="รูปแบบไฟล์">
            <Select value={format} onChange={setFormat} options={toOptions(lookups?.exportFormats)} />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item label="ขนาด">
            <Select value={size} onChange={setSize} options={EXPORT_SIZES} disabled={format === 'svg'} />
          </Form.Item>
        </Col>
      </Row>
      <Space wrap className="w-full">
        <Button type="primary" icon={<DownloadOutlined />} loading={busy} disabled={disabled} onClick={handleDownload}>
          ดาวน์โหลด
        </Button>
        <Button icon={<CopyOutlined />} disabled={disabled || busy} onClick={handleCopy}>
          คัดลอกภาพ
        </Button>
      </Space>
    </Form>
  )
}

export default ExportPanel
