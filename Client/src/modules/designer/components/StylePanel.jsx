// File: Client/src/modules/designer/components/StylePanel.jsx
// Version: 1.1.0
// Description: แผงตกแต่ง QR — Brand preset, ข้อความเหนือ/ใต้ QR, รูปทรง/สีจุด (รองรับไล่สี), มุม, พื้นหลัง, โลโก้ และค่าขั้นสูง
import { App, Button, Col, Collapse, ColorPicker, Empty, Form, Input, Row, Select, Slider, Switch, Upload } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { fileToDataUrl, MAX_LOGO_BYTES } from '../utils/qrStyle.js'

const toOptions = (items = []) => items.map((i) => ({ value: i.value, label: i.label }))
const toHex = (color) => (typeof color === 'string' ? color : color.toHexString())

const StylePanel = ({ style, lookups, presets, onChange, onApplyPreset }) => {
  const { message } = App.useApp()

  // patch แบบระบุ section เช่น set('dotsOptions', { type: 'dots' })
  const set = (section, patch) =>
    onChange(section ? { ...style, [section]: { ...style[section], ...patch } } : { ...style, ...patch })

  const dotsGradient = style.dotsOptions?.gradient
  const gradientType = dotsGradient?.type || 'none'
  const dotColor1 = dotsGradient?.colorStops?.[0]?.color || style.dotsOptions?.color
  const dotColor2 = dotsGradient?.colorStops?.[1]?.color || '#14b8a6'

  const setDotsColor = ({ type = gradientType, color1 = dotColor1, color2 = dotColor2, rotation = dotsGradient?.rotation ?? 0 }) => {
    const dotsOptions = { ...style.dotsOptions, color: color1 }
    if (type === 'none') {
      delete dotsOptions.gradient
    } else {
      dotsOptions.gradient = {
        type,
        rotation,
        colorStops: [
          { offset: 0, color: color1 },
          { offset: 1, color: color2 },
        ],
      }
    }
    onChange({ ...style, dotsOptions })
  }

  const isTransparent = style.backgroundOptions?.color === 'transparent'

  const handleLogo = async (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('รองรับเฉพาะไฟล์รูปภาพ')
    } else if (file.size > MAX_LOGO_BYTES) {
      message.error('โลโก้ต้องมีขนาดไม่เกิน 500 KB')
    } else {
      const dataUrl = await fileToDataUrl(file)
      // มีโลโก้ → บังคับระดับแก้ผิด H เพื่อให้ยังสแกนได้
      onChange({ ...style, image: dataUrl, qrOptions: { ...style.qrOptions, errorCorrectionLevel: 'H' } })
    }
    return false
  }

  const items = [
    {
      key: 'preset',
      label: 'ธีมองค์กร (Brand preset)',
      children: presets?.length ? (
        <Row gutter={[8, 8]}>
          {presets.map((preset) => (
            <Col xs={12} md={8} key={preset.id}>
              <Button block onClick={() => onApplyPreset(preset)} className="!h-auto !py-2 !whitespace-normal">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block aspect-square w-4 shrink-0 rounded-full border"
                    style={{ background: preset.style?.dotsOptions?.color || '#000' }}
                  />
                  {preset.name}
                </span>
              </Button>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มี preset" />
      ),
    },
    {
      key: 'text',
      label: 'ข้อความ',
      children: (
        <Row gutter={12}>
          <Col xs={24}>
            <Form.Item label="ข้อความ (ขึ้นบรรทัดใหม่ได้)">
              <Input.TextArea
                rows={2}
                maxLength={120}
                showCount
                placeholder="เช่น สแกนเพื่อลงทะเบียน"
                value={style.textOptions?.text}
                onChange={(e) => set('textOptions', { text: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="ตำแหน่ง">
              <Select value={style.textOptions?.position} options={toOptions(lookups?.textPositions)} onChange={(position) => set('textOptions', { position })} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="สีข้อความ">
              <ColorPicker value={style.textOptions?.color} showText onChangeComplete={(c) => set('textOptions', { color: toHex(c) })} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="ตัวหนา">
              <Switch checked={style.textOptions?.bold} onChange={(bold) => set('textOptions', { bold })} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="ขนาดตัวอักษร" extra="ถ้าข้อความยาวเกินความกว้าง QR ระบบจะย่อให้อัตโนมัติ">
              <Slider min={16} max={72} value={style.textOptions?.fontSize} onChange={(fontSize) => set('textOptions', { fontSize })} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'dots',
      label: 'จุด (Dots)',
      children: (
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="รูปทรง">
              <Select value={style.dotsOptions?.type} options={toOptions(lookups?.dotTypes)} onChange={(type) => set('dotsOptions', { type })} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="การลงสี">
              <Select value={gradientType} options={toOptions(lookups?.gradientTypes)} onChange={(type) => setDotsColor({ type })} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label={gradientType === 'none' ? 'สี' : 'สีเริ่ม'}>
              <ColorPicker value={dotColor1} showText onChangeComplete={(c) => setDotsColor({ color1: toHex(c) })} />
            </Form.Item>
          </Col>
          {gradientType !== 'none' && (
            <>
              <Col xs={12} md={8}>
                <Form.Item label="สีปลาย">
                  <ColorPicker value={dotColor2} showText onChangeComplete={(c) => setDotsColor({ color2: toHex(c) })} />
                </Form.Item>
              </Col>
              {gradientType === 'linear' && (
                <Col xs={24} md={8}>
                  <Form.Item label="มุมไล่สี">
                    <Slider
                      min={0}
                      max={360}
                      value={Math.round(((dotsGradient?.rotation ?? 0) * 180) / Math.PI)}
                      onChange={(deg) => setDotsColor({ rotation: (deg * Math.PI) / 180 })}
                    />
                  </Form.Item>
                </Col>
              )}
            </>
          )}
        </Row>
      ),
    },
    {
      key: 'corners',
      label: 'มุมทั้ง 3 (Eyes)',
      children: (
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="กรอบมุม">
              <Select value={style.cornersSquareOptions?.type} options={toOptions(lookups?.cornerSquareTypes)} onChange={(type) => set('cornersSquareOptions', { type })} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="สีกรอบมุม">
              <ColorPicker value={style.cornersSquareOptions?.color} showText onChangeComplete={(c) => set('cornersSquareOptions', { color: toHex(c) })} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="จุดกลางมุม">
              <Select value={style.cornersDotOptions?.type} options={toOptions(lookups?.cornerDotTypes)} onChange={(type) => set('cornersDotOptions', { type })} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="สีจุดกลางมุม">
              <ColorPicker value={style.cornersDotOptions?.color} showText onChangeComplete={(c) => set('cornersDotOptions', { color: toHex(c) })} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'background',
      label: 'พื้นหลัง',
      children: (
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="พื้นโปร่งใส">
              <Switch checked={isTransparent} onChange={(on) => set('backgroundOptions', { color: on ? 'transparent' : '#ffffff' })} />
            </Form.Item>
          </Col>
          {!isTransparent && (
            <Col xs={24} md={12}>
              <Form.Item label="สีพื้นหลัง">
                <ColorPicker value={style.backgroundOptions?.color} showText onChangeComplete={(c) => set('backgroundOptions', { color: toHex(c) })} />
              </Form.Item>
            </Col>
          )}
        </Row>
      ),
    },
    {
      key: 'logo',
      label: 'โลโก้กลางภาพ',
      children: (
        <Row gutter={12}>
          <Col xs={24}>
            <Form.Item>
              <div className="flex flex-wrap items-center gap-2">
                <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogo}>
                  <Button icon={<UploadOutlined />}>{style.image ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}</Button>
                </Upload>
                {style.image && (
                  <>
                    <img src={style.image} alt="logo" className="h-10 w-10 rounded border object-contain" />
                    <Button danger icon={<DeleteOutlined />} onClick={() => onChange({ ...style, image: null })}>
                      เอาออก
                    </Button>
                  </>
                )}
              </div>
            </Form.Item>
          </Col>
          {style.image && (
            <>
              <Col xs={24} md={12}>
                <Form.Item label="ขนาดโลโก้">
                  <Slider min={0.1} max={0.5} step={0.05} value={style.imageOptions?.imageSize} onChange={(imageSize) => set('imageOptions', { imageSize })} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="ระยะขอบโลโก้">
                  <Slider min={0} max={20} value={style.imageOptions?.margin} onChange={(margin) => set('imageOptions', { margin })} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="ซ่อนจุดหลังโลโก้">
                  <Switch checked={style.imageOptions?.hideBackgroundDots} onChange={(hideBackgroundDots) => set('imageOptions', { hideBackgroundDots })} />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      ),
    },
    {
      key: 'advanced',
      label: 'ขั้นสูง',
      children: (
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="ระดับแก้ผิด (Error correction)">
              <Select
                value={style.qrOptions?.errorCorrectionLevel}
                options={toOptions(lookups?.errorCorrectionLevels)}
                onChange={(errorCorrectionLevel) => set('qrOptions', { errorCorrectionLevel })}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="ขอบรอบ QR (Quiet zone)">
              <Slider min={0} max={60} value={style.margin} onChange={(margin) => set(null, { margin })} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <Form layout="vertical" component="div">
      <Collapse items={items} defaultActiveKey={['text', 'logo']} bordered={false} className="!bg-transparent" />
    </Form>
  )
}

export default StylePanel
