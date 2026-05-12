"use client";

import { useState } from "react";
import { Layout, Menu, Button, Modal, Input, Typography, Dropdown, Space } from "antd";
import { PlusOutlined, MessageOutlined, DeleteOutlined, MoreOutlined, ExclamationCircleOutlined, EditOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Conversation } from "@/types";

const { Sider } = Layout;
const { Text } = Typography;

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onUpdateConversationTitle?: (id: string, newTitle: string) => void;
  isLoading?: boolean;  // 会话列表加载状态
  isAgentLoading?: boolean;  // 聊天流式输出状态
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function ChatSidebar({
  conversations,
  currentConversationId,
  onCreateConversation,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversationTitle,
  isLoading = false,
  isAgentLoading = false,
  collapsed = false,
  onCollapse,
}: ChatSidebarProps) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [conversationToEdit, setConversationToEdit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const getGroupedConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const grouped = { today: [] as Conversation[], yesterday: [] as Conversation[], earlier: [] as Conversation[] };
    conversations.forEach((conv) => {
      const createDate = new Date(conv.createdAt);
      createDate.setHours(0, 0, 0, 0);
      if (createDate.getTime() === today.getTime()) grouped.today.push(conv);
      else if (createDate.getTime() === yesterday.getTime()) grouped.yesterday.push(conv);
      else grouped.earlier.push(conv);
    });
    return grouped;
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setDeleteModalVisible(false);
      setConversationToDelete(null);
    }
  };

  const handleEditClick = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setConversationToEdit(id);
    setEditTitle(title);
    setEditModalVisible(true);
  };

  const handleEditConfirm = async () => {
    if (conversationToEdit && editTitle.trim() && onUpdateConversationTitle) {
      setIsEditing(true);
      try {
        await onUpdateConversationTitle(conversationToEdit, editTitle.trim());
        setEditModalVisible(false);
        setConversationToEdit(null);
        setEditTitle("");
      } finally {
        setIsEditing(false);
      }
    }
  };

  const getConversationItems = (convs: Conversation[]) =>
    convs.map((conv) => ({
      key: conv.id,
      icon: <MessageOutlined style={{ color: "#9ca3af" }} />,
      onClick: () => onSelectConversation(conv.id),
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text ellipsis style={{ flex: 1, fontSize: 14, color: conv.id === currentConversationId ? "#374151" : "#6b7280", fontWeight: conv.id === currentConversationId ? 500 : 400 }}>
            {conv.title}
          </Text>
          <Dropdown
            menu={{
              items: [
                { key: "edit", icon: <EditOutlined />, label: "重命名", onClick: (e) => handleEditClick(e.domEvent as any, conv.id, conv.title) },
                { type: "divider" },
                { key: "delete", icon: <DeleteOutlined />, label: "删除", danger: true, onClick: (e) => handleDeleteClick(e.domEvent as any, conv.id) },
              ],
            }}
            trigger={["click"]}
          >
            <Button type="text" icon={<MoreOutlined />} size="small" onClick={(e) => e.stopPropagation()} style={{ padding: "0 4px", color: "#9ca3af" }} />
          </Dropdown>
        </div>
      ),
    }));

  const grouped = getGroupedConversations();
  const menuItems: any[] = [];

  if (grouped.today.length > 0)
    menuItems.push({ key: "today-header", type: "group", label: <span style={{ color: "#9ca3af", fontSize: 12 }}>今天</span>, children: getConversationItems(grouped.today) });
  if (grouped.yesterday.length > 0)
    menuItems.push({ key: "yesterday-header", type: "group", label: <span style={{ color: "#9ca3af", fontSize: 12 }}>昨天</span>, children: getConversationItems(grouped.yesterday) });
  if (grouped.earlier.length > 0)
    menuItems.push({ key: "earlier-header", type: "group", label: <span style={{ color: "#9ca3af", fontSize: 12 }}>更早</span>, children: getConversationItems(grouped.earlier) });

  // 会话列表区域
  const renderConversationList = () => {
    // loading 时显示空状态图标（不显示骨架屏）
    if (isLoading) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          color: "#9ca3af",
        }}>
          <MessageOutlined style={{ fontSize: 32, marginBottom: 12 }} />
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>加载中...</Text>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          color: "#9ca3af",
        }}>
          <MessageOutlined style={{ fontSize: 32, marginBottom: 12 }} />
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>暂无会话</Text>
        </div>
      );
    }

    return (
      <Menu
        mode="inline"
        selectedKeys={currentConversationId ? [currentConversationId] : []}
        items={menuItems}
        style={{ border: "none", background: "transparent" }}
      />
    );
  };

  return (
    <>
      {/* 收起状态：显示 Logo + 展开按钮 */}
      {collapsed && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 64,
            height: "100vh",
            background: "#fafafa",
            borderRight: "1px solid #f0f0f0",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 16,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            T
          </div>
          {/* 展开按钮 */}
          <Button
            icon={<MenuUnfoldOutlined />}
            onClick={() => onCollapse?.(false)}
            size="small"
            style={{
              marginTop: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              color: "#9ca3af",
            }}
          />
        </div>
      )}

      {/* 展开状态
          关键：antd Sider 内部多包一层 .ant-layout-sider-children wrapper，
          flex 必须设在那一层（通过 className 在 globals.css 里指定）才能让列表 flex:1 滚动生效 */}
      <Sider
        className="chat-sidebar"
        collapsed={collapsed}
        onCollapse={onCollapse}
        width={260}
        collapsedWidth={0}
        style={{
          background: "#fafafa",
          borderRight: "1px solid #f0f0f0",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 20,
          display: collapsed ? "none" : "block",
          overflow: "hidden",
        }}
        trigger={null}
      >
        {/* Logo + 收起按钮 同一行 */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            background: "#fafafa",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo + 标题 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              T
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>TechMate</span>
          </div>
          {/* 收起按钮 */}
          <Button
            icon={<MenuFoldOutlined />}
            onClick={() => onCollapse?.(true)}
            size="small"
            style={{
              background: "transparent",
              border: "1px solid #e5e7eb",
              color: "#9ca3af",
            }}
          />
        </div>

        {/* 新建对话按钮 — 流式时 disabled，不再用条件隐藏，避免下方列表跳动看上去像重刷新 */}
        {!isLoading && (
          <div style={{ padding: "12px 16px", flexShrink: 0 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={onCreateConversation}
              block
              disabled={isAgentLoading}
              style={{
                borderRadius: 10,
                background: "#fff",
                border: "1px solid #e5e7eb",
                color: isAgentLoading ? "#d1d5db" : "#6b7280",
                height: 40,
                fontSize: 14,
              }}
            >
              {isAgentLoading ? "回答中…" : "开启新对话"}
            </Button>
          </div>
        )}

        {/* 会话列表 — flex:1 现在生效（Sider 已是 flex 容器），高度自动占满剩余空间且可滚动 */}
        <div style={{ padding: "8px", flex: 1, overflowY: "auto", minHeight: 0 }}>
          {renderConversationList()}
        </div>
      </Sider>

      <Modal title="确认删除" open={deleteModalVisible} onOk={handleDeleteConfirm} onCancel={() => setDeleteModalVisible(false)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} centered>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0" }}>
          <ExclamationCircleOutlined style={{ fontSize: 40, color: "#ef4444", marginBottom: 12 }} />
          <Text style={{ color: "#374151" }}>确定删除？删除后无法恢复。</Text>
        </div>
      </Modal>

      <Modal title="编辑标题" open={editModalVisible} onOk={handleEditConfirm} onCancel={() => setEditModalVisible(false)} okText="保存" cancelText="取消" confirmLoading={isEditing}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="标题" maxLength={50} onPressEnter={handleEditConfirm} />
        </Space>
      </Modal>
    </>
  );
}