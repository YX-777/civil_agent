/**
 * 飞书配置
 */

import { logger } from "@civil-agent/core";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  tenantAccessTokenEndpoint: string;
  apiBaseUrl: string;
  defaultTaskListId: string;
}

const DEFAULT_CONFIG: FeishuConfig = {
  appId: process.env.FEISHU_APP_ID || "",
  appSecret: process.env.FEISHU_APP_SECRET || "",
  tenantAccessTokenEndpoint:
    process.env.FEISHU_TENANT_ACCESS_TOKEN_ENDPOINT ||
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
  apiBaseUrl:
    process.env.FEISHU_API_BASE_URL ||
    "https://open.feishu.cn/open-apis/task/v1",
  defaultTaskListId: process.env.FEISHU_DEFAULT_TASK_LIST_ID || "",
};

let cachedConfig: FeishuConfig | null = null;

export function getFeishuConfig(): FeishuConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = { ...DEFAULT_CONFIG };

  if (!config.appId) {
    logger.warn("FEISHU_APP_ID not configured, using empty value");
  }

  if (!config.appSecret) {
    logger.warn("FEISHU_APP_SECRET not configured, using empty value");
  }

  if (!config.defaultTaskListId) {
    logger.warn("FEISHU_DEFAULT_TASK_LIST_ID not configured, using empty value");
  }

  cachedConfig = config;
  return config;
}

export function validateFeishuConfig(config: FeishuConfig): boolean {
  if (!config.appId) {
    logger.error("FEISHU_APP_ID is required");
    return false;
  }

  if (!config.appSecret) {
    logger.error("FEISHU_APP_SECRET is required");
    return false;
  }

  if (!config.defaultTaskListId) {
    logger.error("FEISHU_DEFAULT_TASK_LIST_ID is required");
    return false;
  }

  return true;
}