import { theme } from "antd";

const { defaultAlgorithm, darkAlgorithm } = theme;

export const antdTheme = {
  algorithm: defaultAlgorithm,
  token: {
    colorPrimary: "#3b82f6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#6366f1",
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 600,
    },
    Card: {
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    Input: {
      borderRadius: 8,
    },
    Modal: {
      borderRadius: 12,
    },
  },
};

export const antdDarkTheme = {
  algorithm: darkAlgorithm,
  token: {
    colorPrimary: "#3b82f6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#6366f1",
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 600,
    },
    Card: {
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
    },
    Input: {
      borderRadius: 8,
    },
    Modal: {
      borderRadius: 12,
    },
  },
};