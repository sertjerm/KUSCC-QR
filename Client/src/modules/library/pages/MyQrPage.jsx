// File: Client/src/modules/library/pages/MyQrPage.jsx
// Version: 1.0.0
// Description: รายการ QR ที่ผู้ใช้บันทึกไว้ — ค้นหา, แบ่งหน้าฝั่ง server, เปิดแก้ และลบ
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Col, Empty, Input, Pagination, Popconfirm, Row, Spin, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { deleteQrCode, getLookups, listQrCodes } from '../../../api/qrApi.js'

const PAGE_SIZE = 12

const MyQrPage = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [typeLabels, setTypeLabels] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLookups()
      .then((l) => setTypeLabels(Object.fromEntries((l?.qrTypes || []).map((t) => [t.value, t.label]))))
      .catch(() => {})
  }, [])

  const [reloadKey, setReloadKey] = useState(0)

  // ผู้เรียก setLoading(true) ก่อนเปลี่ยน search/page/reloadKey — effect นี้แค่ดึงข้อมูล
  useEffect(() => {
    let cancelled = false
    listQrCodes({ search, page, pageSize: PAGE_SIZE })
      .then((data) => !cancelled && setResult(data))
      .catch((e) => !cancelled && message.error(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [search, page, reloadKey, message])

  const reload = () => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const handleDelete = async (id) => {
    try {
      await deleteQrCode(id)
      message.success('ลบแล้ว')
      reload()
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <Card
      title="QR ของฉัน"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/designer')}>
          สร้างใหม่
        </Button>
      }
    >
      <Input.Search
        placeholder="ค้นหาชื่อหรือข้อมูลใน QR"
        allowClear
        className="mb-4"
        onSearch={(value) => {
          setLoading(true)
          setPage(1)
          setSearch(value)
        }}
      />
      <Spin spinning={loading}>
        {result.items.length === 0 && !loading ? (
          <Empty description="ยังไม่มี QR ที่บันทึกไว้" />
        ) : (
          <Row gutter={[16, 16]}>
            {result.items.map((qr) => (
              <Col xs={12} sm={8} lg={6} key={qr.id}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => navigate(`/designer/${qr.id}`)}
                  cover={
                    <div className="qr-checkerboard p-3">
                      {qr.thumbnailDataUrl ? (
                        <img src={qr.thumbnailDataUrl} alt={qr.name} className="mx-auto block aspect-square w-full object-contain" />
                      ) : (
                        <div className="aspect-square w-full" />
                      )}
                    </div>
                  }
                  actions={[
                    <EditOutlined key="edit" />,
                    <Popconfirm
                      key="delete"
                      title="ลบ QR นี้?"
                      okText="ลบ"
                      cancelText="ยกเลิก"
                      okButtonProps={{ danger: true }}
                      onConfirm={(e) => {
                        e?.stopPropagation()
                        handleDelete(qr.id)
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>,
                  ]}
                >
                  <Typography.Text strong ellipsis className="block">
                    {qr.name}
                  </Typography.Text>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <Tag className="!m-0">{typeLabels[qr.qrType] || qr.qrType}</Tag>
                    <Typography.Text type="secondary" className="text-xs">
                      {new Date(qr.updatedAt).toLocaleDateString('th-TH')}
                    </Typography.Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
      {result.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <Pagination current={page} pageSize={PAGE_SIZE} total={result.total} onChange={(p) => { setLoading(true); setPage(p) }} showSizeChanger={false} />
        </div>
      )}
    </Card>
  )
}

export default MyQrPage
