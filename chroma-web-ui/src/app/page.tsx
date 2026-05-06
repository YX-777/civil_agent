'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Tabs, Button, Modal, Input, message, Spin, Tag, Typography } from 'antd'
import axios from 'axios'

const { Title, Text } = Typography

const CHROMA_URL = '/api/chroma'

interface Collection {
  id: string
  name: string
  metadata?: Record<string, any>
}

interface CollectionDetail {
  count: number
  items: Array<{
    id: string
    document?: string
    metadata?: Record<string, any>
  }>
}

export default function Home() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [collectionDetail, setCollectionDetail] = useState<CollectionDetail | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocMeta, setNewDocMeta] = useState('')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const res = await axios.get(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections`)
      setCollections(res.data || [])
      setLoading(false)
    } catch (e) {
      message.error('连接 ChromaDB 失败')
      setLoading(false)
    }
  }

  const fetchCollectionDetail = async (collectionId: string) => {
    try {
      setLoading(true)
      // Get count
      const countRes = await axios.get(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${collectionId}/count`)

      // Get items (limit to 20)
      const itemsRes = await axios.post(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${collectionId}/get`, {
        limit: 20
      })

      setCollectionDetail({
        count: countRes.data,
        items: itemsRes.data?.ids?.map((id: string, i: number) => ({
          id,
          document: itemsRes.data?.documents?.[i],
          metadata: itemsRes.data?.metadatas?.[i]
        })) || []
      })
      setLoading(false)
    } catch (e) {
      message.error('获取 Collection 数据失败')
      setLoading(false)
    }
  }

  const handleCollectionClick = (collectionId: string) => {
    setActiveCollection(collectionId)
    fetchCollectionDetail(collectionId)
  }

  const searchDocuments = async () => {
    if (!searchQuery || !activeCollection) return
    try {
      setLoading(true)
      const res = await axios.post(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${activeCollection}/query`, {
        query_texts: [searchQuery],
        n_results: 10
      })

      setCollectionDetail({
        count: collectionDetail?.count || 0,
        items: res.data?.ids?.[0]?.map((id: string, i: number) => ({
          id,
          document: res.data?.documents?.[0]?.[i],
          metadata: res.data?.metadatas?.[0]?.[i],
          distance: res.data?.distances?.[0]?.[i]
        })) || []
      })
      setLoading(false)
    } catch (e) {
      message.error('搜索失败')
      setLoading(false)
    }
  }

  const addDocument = async () => {
    if (!newDocContent || !activeCollection) return
    try {
      const id = `doc-${Date.now()}`
      const metadata = newDocMeta ? JSON.parse(newDocMeta) : {}

      await axios.post(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${activeCollection}/add`, {
        ids: [id],
        documents: [newDocContent],
        metadatas: [metadata]
      })

      message.success('添加成功')
      setModalVisible(false)
      setNewDocContent('')
      setNewDocMeta('')
      fetchCollectionDetail(activeCollection)
    } catch (e: any) {
      message.error(e.response?.data?.message || '添加失败')
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!activeCollection) return
    try {
      await axios.post(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${activeCollection}/delete`, {
        ids: [docId]
      })
      message.success('删除成功')
      fetchCollectionDetail(activeCollection)
    } catch (e) {
      message.error('删除失败')
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>ChromaDB 向量数据库查看器</Title>
      <Text type="secondary">连接地址: localhost:8000</Text>

      <Spin spinning={loading}>
        <Card title="Collections" style={{ marginTop: 16 }}>
          {collections.length === 0 ? (
            <Text type="secondary">暂无 Collection</Text>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {collections.map(c => (
                <Tag
                  key={c.id}
                  color={activeCollection === c.id ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => handleCollectionClick(c.id)}
                >
                  {c.name}
                </Tag>
              ))}
            </div>
          )}
        </Card>

        {activeCollection && collectionDetail && (
          <Card
            title={`${collections.find(c => c.id === activeCollection)?.name || '未知'} - ${collectionDetail.count} 条记录`}
            style={{ marginTop: 16 }}
            extra={
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="搜索文档..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onPressEnter={searchDocuments}
                  style={{ width: 200 }}
                />
                <Button onClick={searchDocuments}>搜索</Button>
                <Button type="primary" onClick={() => setModalVisible(true)}>添加文档</Button>
              </div>
            }
          >
            <Table
              dataSource={collectionDetail.items}
              rowKey="id"
              columns={[
                { title: 'ID', dataIndex: 'id', width: 200 },
                {
                  title: '文档内容',
                  dataIndex: 'document',
                  render: (text: string) => text?.length > 100 ? text.slice(0, 100) + '...' : text
                },
                {
                  title: 'Metadata',
                  dataIndex: 'metadata',
                  render: (meta: Record<string, any>) => (
                    <Text code style={{ fontSize: 12 }}>
                      {meta ? JSON.stringify(meta).slice(0, 80) + '...' : '-'}
                    </Text>
                  )
                },
                {
                  title: '操作',
                  render: (_, record) => (
                    <Button danger size="small" onClick={() => deleteDocument(record.id)}>删除</Button>
                  )
                }
              ]}
              pagination={false}
            />
          </Card>
        )}
      </Spin>

      <Modal
        title="添加文档"
        open={modalVisible}
        onOk={addDocument}
        onCancel={() => setModalVisible(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>文档内容:</Text>
          <Input.TextArea
            value={newDocContent}
            onChange={e => setNewDocContent(e.target.value)}
            rows={4}
            placeholder="输入文档内容..."
          />
        </div>
        <div>
          <Text>Metadata (JSON):</Text>
          <Input
            value={newDocMeta}
            onChange={e => setNewDocMeta(e.target.value)}
            placeholder='{"category": "react", "source": "TechMate"}'
          />
        </div>
      </Modal>
    </main>
  )
}