/**
 * Agent 配置
 */

export interface AgentConfig {
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
    apiKey?: string;
  };
  mcp: {
    bailianRagUrl: string;
    feishuTasksUrl?: string;
  };
  features: {
    ragEnabled: boolean;
    emotionDetectionEnabled: boolean;
    contextEnhancementEnabled: boolean;
    quickRepliesEnabled: boolean;
  };
  thresholds: {
    emotionSupportThreshold: number;
    ragConfidenceThreshold: number;
    maxConversationHistory: number;
    maxQuickReplies: number;
  };
  timeouts: {
    llmTimeout: number;
    mcpTimeout: number;
    nodeExecutionTimeout: number;
  };
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  llm: {
    model: "claude-3-sonnet-20240229",
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  mcp: {
    bailianRagUrl: process.env.MCP_BAILIAN_RAG_URL || "http://localhost:3002",
    feishuTasksUrl: process.env.MCP_FEISHU_TASKS_URL,
  },
  features: {
    ragEnabled: true,
    emotionDetectionEnabled: true,
    contextEnhancementEnabled: true,
    quickRepliesEnabled: true,
  },
  thresholds: {
    emotionSupportThreshold: 3,
    ragConfidenceThreshold: 0.6,
    maxConversationHistory: 10,
    maxQuickReplies: 4,
  },
  timeouts: {
    llmTimeout: 30000,
    mcpTimeout: 10000,
    nodeExecutionTimeout: 60000,
  },
};

/**
 * 获取 Agent 配置
 */
export function getAgentConfig(): AgentConfig {
  return DEFAULT_AGENT_CONFIG;
}

/**
 * 更新 Agent 配置
 */
export function updateAgentConfig(partialConfig: Partial<AgentConfig>): AgentConfig {
  const currentConfig = getAgentConfig();
  return {
    ...currentConfig,
    ...partialConfig,
    llm: { ...currentConfig.llm, ...partialConfig.llm },
    mcp: { ...currentConfig.mcp, ...partialConfig.mcp },
    features: { ...currentConfig.features, ...partialConfig.features },
    thresholds: { ...currentConfig.thresholds, ...partialConfig.thresholds },
    timeouts: { ...currentConfig.timeouts, ...partialConfig.timeouts },
  };
}

/**
 * 验证 Agent 配置
 */
export function validateAgentConfig(config: AgentConfig): boolean {
  if (!config.llm.model) {
    throw new Error("LLM model is required");
  }

  if (!config.llm.apiKey && process.env.ANTHROPIC_API_KEY) {
    config.llm.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (!config.llm.apiKey) {
    console.warn("ANTHROPIC_API_KEY is not set");
  }

  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    throw new Error("LLM temperature must be between 0 and 2");
  }

  if (config.llm.maxTokens <= 0) {
    throw new Error("LLM maxTokens must be positive");
  }

  return true;
}