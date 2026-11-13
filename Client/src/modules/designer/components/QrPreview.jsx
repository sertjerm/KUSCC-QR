// File: Client/src/modules/designer/components/QrPreview.jsx
// Version: 1.1.0
// Description: ภาพตัวอย่าง QR แบบ live — render ผ่าน qrRenderer (รวมข้อความ) แล้วแสดงเป็น <img>
//              ทิ้งผลลัพธ์ที่มาช้ากว่า (race) และ revoke object URL เก่าหลังได้ภาพใหม่แล้ว (ไม่ให้ภาพกระพริบ)
import { useEffect, useRef, useState } from 'react'
import { renderQrBlob } from '../utils/qrRenderer.js'

const QrPreview = ({ style, content }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const currentUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    renderQrBlob(style, content)
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = url
        setImageUrl(url)
      })
      .catch((error) => console.error('render QR ไม่สำเร็จ', error))
    return () => {
      cancelled = true
    }
  }, [style, content])

  // revoke URL สุดท้ายตอนออกจากหน้า
  useEffect(() => () => currentUrlRef.current && URL.revokeObjectURL(currentUrlRef.current), [])

  return imageUrl ? (
    <img src={imageUrl} alt="ตัวอย่าง QR" className="block h-auto w-full" />
  ) : (
    <div className="aspect-square w-full" />
  )
}

export default QrPreview
