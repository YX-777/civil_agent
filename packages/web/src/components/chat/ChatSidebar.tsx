"use client";

import { useState } from "react";
import { Layout, Menu, Button, Modal, Input, Empty, Typography, Dropdown, Space } from "antd";
import {
  PlusOutlined,
  MessageOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
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
  isLoading = false,
  collapsed = false,
  onCollapse,
}: ChatSidebarProps) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

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
      const convDate = new Date(conv.updatedAt);
      convDate.setHours(0, 0, 0, 0);

      if (convDate.getTime() === today.getTime()) {
        grouped.today.push(conv);
      } else if (convDate.getTime() === yesterday.getTime()) {
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

  const getConversationItems = (convs: Conversation[]) => {
    return convs.map((conv) => ({
      key: conv.id,
      icon: <MessageOutlined />,
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
              color: conv.id === currentConversationId ? "#1677ff" : "inherit",
            }}
          >
            {conv.title}
          </Text>
          <Dropdown
            menu={{
              items: [
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
              style={{ padding: "0 4px" }}
            />
          </Dropdown>
        </div>
      ),
    }));
  };

  const grouped = getGroupedConversations();

  const menuItems: any[] = [
    {
      key: "new",
      icon: <PlusOutlined />,
      label: "新建会话",
      onClick: onCreateConversation,
    },
    {
      type: "divider",
    },
  ];

  if (grouped.today.length > 0) {
    menuItems.push({
      key: "today-header",
      type: "group",
      label: "今天",
      children: getConversationItems(grouped.today),
    });
  }

  if (grouped.yesterday.length > 0) {
    menuItems.push({
      key: "yesterday-header",
      type: "group",
      label: "昨天",
      children: getConversationItems(grouped.yesterday),
    });
  }

  if (grouped.earlier.length > 0) {
    menuItems.push({
      key: "earlier-header",
      type: "group",
      label: "更早",
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
              <Text type="secondary">暂无会话</Text>
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
        style={{
          background: "#fff",
          borderRight: "1px solid #f0f0f0",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 10,
        }}
        trigger={null}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!collapsed && (
            <Text strong style={{ fontSize: 16 }}>
              对话历史
            </Text>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateConversation}
            size={collapsed ? "small" : "middle"}
          >
            {collapsed ? "" : "新建会话"}
          </Button>
        </div>

        <div
          style={{
            padding: "8px",
            height: "calc(100vh - 65px)",
            overflowY: "auto",
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={currentConversationId ? [currentConversationId] : []}
            items={menuItems}
            style={{ border: "none" }}
          />
        </div>
      </Sider>

      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalVisible(false);
          setConversationToDelete(null);
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" size="middle">
          <ExclamationCircleOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
          <Text>确定要删除这个会话吗？删除后无法恢复。</Text>
        </Space>
      </Modal>
    </>
  );
}
