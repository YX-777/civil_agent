"use client";

import { useState } from "react";
import { Layout, Menu, Button, Modal, Input, Empty, Typography, Dropdown, Space } from "antd";
import {
  PlusOutlined,
  MessageOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
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
  isLoading?: boolean;
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

    const grouped = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      earlier: [] as Conversation[],
    };

    conversations.forEach((conv) => {
      const createDate = new Date(conv.createdAt);
      createDate.setHours(0, 0, 0, 0);

      if (createDate.getTime() === today.getTime()) {
        grouped.today.push(conv);
      } else if (createDate.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(conv);
      } else {
        grouped.earlier.push(conv);
      }
    });

    return grouped;
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setDeleteModalVisible(false);
      setConversationToDelete(null);
    }
  };

  const handleEditClick = (e: React.MouseEvent, conversationId: string, currentTitle: string) => {
    e.stopPropagation();
    setConversationToEdit(conversationId);
    setEditTitle(currentTitle);
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
      } catch (error) {
        console.error("Failed to update conversation title:", error);
      } finally {
        setIsEditing(false);
      }
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setConversationToEdit(null);
    setEditTitle("");
  };

  const getConversationItems = (convs: Conversation[]) => {
    return convs.map((conv) => ({
      key: conv.id,
      icon: <MessageOutlined />,
      onClick: () => onSelectConversation(conv.id),
      label: (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text
            ellipsis
            style={{
              flex: 1,
              fontSize: 14,
              color: conv.id === currentConversationId ? "#0D9488" : "#134E4A",
              fontWeight: conv.id === currentConversationId ? 600 : 400,
            }}
          >
            {conv.title}
          </Text>
          <Dropdown
            menu={{
              items: [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "重命名",
                  onClick: (e) => handleEditClick(e.domEvent as any, conv.id, conv.title),
                },
                {
                  type: "divider",
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "删除",
                  danger: true,
                  onClick: (e) => handleDeleteClick(e.domEvent as any, conv.id),
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              onClick={(e) => e.stopPropagation()}
              style={{ padding: "0 4px", color: "#0D9488" }}
            />
          </Dropdown>
        </div>
      ),
    }));
  };

  const grouped = getGroupedConversations();

  const menuItems: any[] = [];

  if (grouped.today.length > 0) {
    menuItems.push({
      key: "today-header",
      type: "group",
      label: <span style={{ color: "#0D9488", fontWeight: 600 }}>今天</span>,
      children: getConversationItems(grouped.today),
    });
  }

  if (grouped.yesterday.length > 0) {
    menuItems.push({
      key: "yesterday-header",
      type: "group",
      label: <span style={{ color: "#0D9488", fontWeight: 600 }}>昨天</span>,
      children: getConversationItems(grouped.yesterday),
    });
  }

  if (grouped.earlier.length > 0) {
    menuItems.push({
      key: "earlier-header",
      type: "group",
      label: <span style={{ color: "#0D9488", fontWeight: 600 }}>更早</span>,
      children: getConversationItems(grouped.earlier),
    });
  }

  if (conversations.length === 0 && !isLoading) {
    menuItems.push({
      key: "empty",
      label: (
        <div style={{ padding: "20px 0" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text style={{ color: "#134E4A" }}>暂无会话</Text>
            }
          />
        </div>
      ),
      disabled: true,
    });
  }

  return (
    <>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        width={280}
        className="glass-card"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          borderRight: "1px solid rgba(13, 148, 136, 0.1)",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 20px rgba(13, 148, 136, 0.08)",
        }}
        trigger={null}
      >
        <div
          className="glass-card"
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(13, 148, 136, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderRadius: 0,
          }}
        >
          {!collapsed && (
            <Text strong style={{ fontSize: 16, color: "#134E4A" }}>
              对话历史
            </Text>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateConversation}
            size={collapsed ? "small" : "middle"}
            className="hover-lift"
            style={{
              background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)",
              border: "none",
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
            }}
          >
            {collapsed ? "" : "新建会话"}
          </Button>
        </div>

        <div
          style={{
            padding: "8px",
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={currentConversationId ? [currentConversationId] : []}
            items={menuItems}
            style={{ border: "none", background: "transparent" }}
          />
        </div>
      </Sider>

      <Modal
        title={<span style={{ color: "#134E4A" }}>确认删除</span>}
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalVisible(false);
          setConversationToDelete(null);
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        centered
        className="glass-card"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 0",
          }}
        >
          <ExclamationCircleOutlined
            style={{
              fontSize: 48,
              color: "#ef4444",
              marginBottom: 16,
            }}
          />
          <Text style={{ fontSize: 14, color: "#134E4A" }}>
            确定要删除这个会话吗？删除后无法恢复。
          </Text>
        </div>
      </Modal>

      <Modal
        title={<span style={{ color: "#134E4A" }}>编辑会话标题</span>}
        open={editModalVisible}
        onOk={handleEditConfirm}
        onCancel={handleEditCancel}
        okText="保存"
        cancelText="取消"
        confirmLoading={isEditing}
        className="glass-card"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text style={{ color: "#134E4A" }}>请输入新的会话标题：</Text>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="会话标题"
            maxLength={50}
            showCount
            onPressEnter={handleEditConfirm}
            style={{ borderRadius: 10 }}
          />
        </Space>
      </Modal>
    </>
  );
}