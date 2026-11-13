// File: Client/src/modules/designer/components/QrPreview.jsx
// Version: 1.0.0
// Description: ภาพตัวอย่าง QR แบบ live — สร้าง QRCodeStyling ครั้งเดียวแล้ว update เมื่อ options เปลี่ยน
import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

const QrPreview = ({ options }) => {
  const containerRef = useRef(null)
  const qrRef = useRef(null)

  useEffect(() => {
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options)
      qrRef.current.append(containerRef.current)
    } else {
      qrRef.current.update(options)
    }
  }, [options])

  return <div ref={containerRef} className="qr-preview w-full" />
}

export default QrPreview
