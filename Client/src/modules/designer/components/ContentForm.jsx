// File: Client/src/modules/designer/components/ContentForm.jsx
// Version: 1.0.0
// Description: ฟอร์มกรอกข้อมูลตามประเภท QR (URL, ข้อความ, vCard, Wi-Fi, อีเมล, โทรศัพท์)
import { Checkbox, Col, Form, Input, Row, Select } from 'antd'

const toOptions = (items = []) => items.map((i) => ({ value: i.value, label: i.label }))

const FIELDS = {
  url: () => (
    <Form.Item name="url" label="ลิงก์" rules={[{ required: true, message: 'กรอกลิงก์' }, { type: 'url', message: 'รูปแบบลิงก์ไม่ถูกต้อง' }]}>
      <Input placeholder="https://..." allowClear />
    </Form.Item>
  ),
  text: () => (
    <Form.Item name="text" label="ข้อความ" rules={[{ required: true, message: 'กรอกข้อความ' }]}>
      <Input.TextArea rows={4} showCount maxLength={1000} />
    </Form.Item>
  ),
  tel: () => (
    <Form.Item name="phone" label="เบอร์โทรศัพท์" rules={[{ required: true, message: 'กรอกเบอร์โทรศัพท์' }]}>
      <Input placeholder="02-xxx-xxxx" allowClear />
    </Form.Item>
  ),
  email: () => (
    <>
      <Form.Item name="to" label="ถึง (อีเมล)" rules={[{ required: true, message: 'กรอกอีเมล' }, { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}>
        <Input allowClear />
      </Form.Item>
      <Form.Item name="subject" label="หัวข้อ">
        <Input allowClear />
      </Form.Item>
      <Form.Item name="body" label="ข้อความ">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  ),
  wifi: (lookups) => (
    <Row gutter={12}>
      <Col xs={24} md={12}>
        <Form.Item name="ssid" label="ชื่อเครือข่าย (SSID)" rules={[{ required: true, message: 'กรอก SSID' }]}>
          <Input allowClear />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="encryption" label="การเข้ารหัส">
          <Select options={toOptions(lookups?.wifiEncryptions)} />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="password" label="รหัสผ่าน">
          <Input.Password />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="hidden" valuePropName="checked" label=" ">
          <Checkbox>เครือข่ายซ่อนชื่อ</Checkbox>
        </Form.Item>
      </Col>
    </Row>
  ),
  vcard: () => (
    <Row gutter={12}>
      {[
        ['firstName', 'ชื่อ', true],
        ['lastName', 'นามสกุล'],
        ['org', 'หน่วยงาน', false, 24],
        ['title', 'ตำแหน่ง'],
        ['email', 'อีเมล'],
        ['mobile', 'มือถือ'],
        ['phone', 'โทรศัพท์ที่ทำงาน'],
        ['website', 'เว็บไซต์', false, 24],
        ['address', 'ที่อยู่', false, 24],
      ].map(([name, label, required, span]) => (
        <Col xs={24} md={span || 12} key={name}>
          <Form.Item name={name} label={label} rules={required ? [{ required: true, message: `กรอก${label}` }] : undefined}>
            <Input allowClear />
          </Form.Item>
        </Col>
      ))}
    </Row>
  ),
}

const ContentForm = ({ qrType, data, lookups, onChange }) => {
  // ผู้เรียกส่ง key ใหม่เมื่อเปลี่ยนประเภท/โหลด QR เพื่อ remount ฟอร์มด้วย initialValues ใหม่
  const renderFields = FIELDS[qrType]
  return (
    <Form
      layout="vertical"
      initialValues={data}
      onValuesChange={(_, all) => onChange(all)}
      requiredMark={false}
    >
      {renderFields ? renderFields(lookups) : null}
    </Form>
  )
}

export default ContentForm
