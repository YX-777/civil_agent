import { theme } from "antd";

const { defaultAlgorithm, darkAlgorithm } = theme;

export const antdTheme = {
  algorithm: defaultAlgorithm,
  token: {
    colorPrimary: "#8b5cf6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#6366f1",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#ffffff",
    colorText: "#1f2937",
    colorTextSecondary: "#6b7280",
  },
  components: {
    Button: {
      borderRadius: 10,
      fontWeight: 600,
      primaryShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
    },
    Card: {
      borderRadius: 16,
      boxShadow: "0 4px 16px rgba(139, 92, 246, 0.08)",
      colorBgContainer: "#ffffff",
    },
    Input: {
      borderRadius: 10,
      colorBgContainer: "#ffffff",
    },
    Modal: {
      borderRadius: 16,
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "rgba(139, 92, 246, 0.1)",
      itemSelectedColor: "#8b5cf6",
      itemHoverBg: "rgba(139, 92, 246, 0.05)",
      itemHoverColor: "#a78bfa",
    },
    Layout: {
      headerBg: "#ffffff",
      headerPadding: "0 24px",
      headerHeight: 64,
    },
    Message: {
      contentBg: "#ffffff",
    },
  },
};

export const antdDarkTheme = {
  algorithm: darkAlgorithm,
  token: {
    colorPrimary: "#14B8A6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#6366f1",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgContainer: "rgba(15, 23, 42, 0.85)",
    colorBgLayout: "#0f172a",
    colorText: "#f8fafc",
    colorTextSecondary: "#94a3b8",
  },
  components: {
    Button: {
      borderRadius: 10,
      fontWeight: 600,
      primaryShadow: "0 4px 12px rgba(20, 184, 166, 0.25)",
    },
    Card: {
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      colorBgContainer: "rgba(15, 23, 42, 0.85)",
    },
    Input: {
      borderRadius: 10,
      colorBgContainer: "rgba(30, 41, 59, 0.9)",
    },
    Modal: {
      borderRadius: 16,
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "rgba(20, 184, 166, 0.15)",
      itemSelectedColor: "#14B8A6",
      itemHoverBg: "rgba(20, 184, 166, 0.08)",
      itemHoverColor: "#5EEAD4",
    },
    Layout: {
      headerBg: "rgba(15, 23, 42, 0.85)",
      headerPadding: "0 24px",
      headerHeight: 64,
    },
    Message: {
      contentBg: "rgba(30, 41, 59, 0.95)",
    },
  },
};