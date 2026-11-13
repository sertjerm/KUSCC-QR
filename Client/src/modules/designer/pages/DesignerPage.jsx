// File: Client/src/modules/designer/pages/DesignerPage.jsx
// Version: 1.2.0
// Description: หน้าออกแบบ QR — ซ้ายกรอกข้อมูล/ตกแต่ง, ขวาภาพตัวอย่าง live + บันทึก + ดาวน์โหลด
//              /designer = สร้างใหม่, /designer/:id = แก้ QR ที่บันทึกไว้
//              ประเภท URL เปิด Dynamic link ได้ — QR เก็บลิงก์สั้น (ได้หลังบันทึก) แล้วแก้ปลายทางภายหลังได้
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, App, Button, Card, Col, Divider, Input, Radio, Row, Space, Spin, Switch, Typography } from 'antd'
import { CopyOutlined, SaveOutlined } from '@ant-design/icons'
import { createQrCode, getBrandPresets, getLookups, getQrCode, updateQrCode } from '../../../api/qrApi.js'
import { DEFAULT_STYLE, getScanWarnings, mergeStyle } from '../utils/qrStyle.js'
import { makeThumbnailDataUrl } from '../utils/qrRenderer.js'
import { buildQrContent, DEFAULT_DATA, getByteLength, MAX_CONTENT_BYTES } from '../utils/qrContent.js'
import QrPreview from '../components/QrPreview.jsx'
import ContentForm from '../components/ContentForm.jsx'
import StylePanel from '../components/StylePanel.jsx'
import ExportPanel from '../components/ExportPanel.jsx'
import DynamicLinkInfo from '../components/DynamicLinkInfo.jsx'

const DesignerPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [lookups, setLookups] = useState(null)
  const [presets, setPresets] = useState([])
  const [qrType, setQrType] = useState('url')
  const [dataByType, setDataByType] = useState(DEFAULT_DATA)
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [name, setName] = useState('')
  const [isDynamic, setIsDynamic] = useState(false)
  // ข้อมูลลิงก์สั้นจาก API (null = ยังไม่ได้บันทึกเป็น Dynamic)
  const [dynamicLink, setDynamicLink] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)

  // โหลดตัวเลือก dropdown + preset จาก API
  useEffect(() => {
    getLookups().then(setLookups).catch((e) => message.error(`โหลดตัวเลือกไม่สำเร็จ: ${e.message}`))
    getBrandPresets().then((rows) => setPresets(rows || [])).catch(() => setPresets([]))
  }, [message])

  // โหลด QR ที่บันทึกไว้เมื่อเปิด /designer/:id
  useEffect(() => {
    if (!id) return
    let cancelled = false
    getQrCode(id)
      .then((qr) => {
        if (cancelled) return
        setQrType(qr.qrType)
        setDataByType((prev) => ({ ...prev, [qr.qrType]: { ...DEFAULT_DATA[qr.qrType], ...qr.data } }))
        setStyle(mergeStyle(DEFAULT_STYLE, qr.style))
        setName(qr.name)
        setIsDynamic(Boolean(qr.dynamicLink))
        setDynamicLink(qr.dynamicLink)
        setFormKey((k) => k + 1)
      })
      .catch((e) => {
        message.error(e.message)
        navigate('/designer', { replace: true })
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, message, navigate])

  const data = dataByType[qrType]
  // targetContent = ข้อมูลจากฟอร์ม; content = สิ่งที่ encode ลง QR จริง (Dynamic ที่บันทึกแล้ว = ลิงก์สั้น)
  const targetContent = useMemo(() => buildQrContent(qrType, data), [qrType, data])
  const dynamicActive = qrType === 'url' && isDynamic
  const isPendingDynamic = dynamicActive && !dynamicLink
  const content = dynamicActive && dynamicLink ? dynamicLink.shortUrl : targetContent
  const warnings = useMemo(() => getScanWarnings(style), [style])
  const contentBytes = getByteLength(targetContent)
  const isContentValid = contentBytes > 0 && contentBytes <= MAX_CONTENT_BYTES

  const handleSave = async (asNew = false) => {
    if (!name.trim()) {
      message.warning('ตั้งชื่อ QR ก่อนบันทึก')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        qrType,
        content: targetContent,
        data,
        style,
        isDynamic: dynamicActive,
        thumbnailDataUrl: await makeThumbnailDataUrl(style, content),
      }
      let saved = id && !asNew ? await updateQrCode(id, payload) : await createQrCode(payload)
      // Dynamic ที่เพิ่งได้ลิงก์สั้น → ภาพย่อที่ส่งไปยังเป็น QR เก่า สร้างใหม่จาก content จริงแล้วบันทึกซ้ำ
      if (saved.content !== content) {
        saved = await updateQrCode(saved.id, { ...payload, thumbnailDataUrl: await makeThumbnailDataUrl(style, saved.content) })
      }
      message.success('บันทึกแล้ว')
      setDynamicLink(saved.dynamicLink)
      if (String(saved.id) !== String(id)) navigate(`/designer/${saved.id}`, { replace: true })
    } catch (e) {
      message.error(`บันทึกไม่สำเร็จ: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={{ span: 24, order: 2 }} lg={{ span: 14, order: 1 }}>
        <Space orientation="vertical" size={16} className="w-full">
          <Card title="1. ข้อมูลใน QR">
            <Radio.Group
              className="!mb-4 flex flex-wrap gap-2"
              optionType="button"
              buttonStyle="solid"
              value={qrType}
              // Dynamic ที่บันทึกแล้วต้องเป็น URL ตลอด (ลิงก์สั้นพาไปได้แค่เว็บ)
              options={(lookups?.qrTypes || []).map((t) => ({ value: t.value, label: t.label, disabled: Boolean(dynamicLink) && t.value !== 'url' }))}
              onChange={(e) => {
                setQrType(e.target.value)
                setFormKey((k) => k + 1)
              }}
            />
            <ContentForm
              key={`${qrType}-${formKey}`}
              qrType={qrType}
              data={data}
              lookups={lookups}
              onChange={(values) => setDataByType((prev) => ({ ...prev, [qrType]: { ...prev[qrType], ...values } }))}
            />
            {qrType === 'url' && (
              <div className="rounded-lg border border-solid border-gray-200 p-3">
                <Space align="start">
                  <Switch checked={isDynamic} disabled={Boolean(dynamicLink)} onChange={setIsDynamic} />
                  <div>
                    <Typography.Text strong>Dynamic link — แก้ปลายทางได้ภายหลัง</Typography.Text>
                    <Typography.Paragraph type="secondary" className="!mb-0 text-xs">
                      QR จะเก็บลิงก์สั้นของสหกรณ์แล้วพาไปยังลิงก์ด้านบน เปลี่ยนลิงก์เมื่อไรก็ได้โดยไม่ต้องพิมพ์ QR ใหม่ และนับจำนวนการสแกนได้
                      {dynamicLink && ' (เปิดแล้วปิดไม่ได้ เพื่อให้ QR ที่พิมพ์ไปแล้วใช้ได้ต่อ)'}
                    </Typography.Paragraph>
                  </div>
                </Space>
                {dynamicLink && <DynamicLinkInfo link={dynamicLink} currentTarget={targetContent} />}
              </div>
            )}
          </Card>
          <Card title="2. ตกแต่ง" styles={{ body: { padding: 8 } }}>
            <StylePanel
              style={style}
              lookups={lookups}
              presets={presets}
              onChange={setStyle}
              onApplyPreset={(preset) =>
                // preset เปลี่ยนแค่สี/รูปทรง — คงโลโก้และข้อความที่ผู้ใช้ใส่ไว้
                setStyle((prev) => mergeStyle({ ...DEFAULT_STYLE, image: prev.image, textOptions: prev.textOptions }, preset.style))
              }
            />
          </Card>
        </Space>
      </Col>

      {/* มือถือ: แสดงตัวอย่างก่อนฟอร์ม เพื่อเห็นผลทันทีที่แก้ */}
      <Col xs={{ span: 24, order: 1 }} lg={{ span: 10, order: 2 }}>
        <div className="lg:sticky lg:top-4">
          <Card title="3. ตัวอย่าง & ดาวน์โหลด">
            <div className="qr-checkerboard mx-auto w-full max-w-sm overflow-hidden rounded-xl border">
              <QrPreview style={style} content={content} />
            </div>
            <Typography.Text type={isContentValid ? 'secondary' : 'danger'} className="mt-2 block text-center text-xs">
              {contentBytes === 0 ? 'ยังไม่มีข้อมูล — กรอกข้อมูลด้านซ้าย' : `${contentBytes.toLocaleString()} / ${MAX_CONTENT_BYTES.toLocaleString()} bytes`}
            </Typography.Text>

            {isPendingDynamic && (
              <Alert
                className="!mt-3"
                type="info"
                showIcon
                title="กดบันทึกเพื่อรับลิงก์สั้น"
                description="ภาพนี้เป็นตัวอย่างเท่านั้น — QR จริงจะสร้างจากลิงก์สั้นหลังบันทึก จึงยังดาวน์โหลดไม่ได้"
              />
            )}

            {warnings.length > 0 && (
              <Alert
                className="!mt-3"
                type="warning"
                showIcon
                title="อาจสแกนยาก"
                description={
                  <ul className="m-0 list-disc pl-4">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Divider />
            <Input placeholder="ตั้งชื่อ QR เช่น 'โปสเตอร์ประชุมใหญ่ 2569'" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
            <Space wrap className="mt-3">
              <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!isContentValid} onClick={() => handleSave(false)}>
                {id ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </Button>
              {id && (
                <Button icon={<CopyOutlined />} disabled={saving || !isContentValid} onClick={() => handleSave(true)}>
                  บันทึกเป็นอันใหม่
                </Button>
              )}
            </Space>

            <Divider />
            <ExportPanel style={style} content={content} name={name} lookups={lookups} disabled={!isContentValid || isPendingDynamic} />
          </Card>
        </div>
      </Col>
    </Row>
  )
}

export default DesignerPage
