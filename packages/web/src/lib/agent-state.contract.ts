export interface ChatPayloadValidation {
  ok: boolean;
  code?: "INVALID_ARGUMENT";
  error?: string;
}

/**
 * 校验一次对话请求的必要字段。
 * Phase A 要求每次请求都必须绑定明确的会话 ID。
 */
export function validateChatPayload(message: unknown, userId: unknown, conversationId: unknown): ChatPayloadValidation {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, code: "INVALID_ARGUMENT", error: "Invalid message format" };
  }
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return { ok: false, code: "INVALID_ARGUMENT", error: "userId is required" };
  }
  if (!conversationId || typeof conversationId !== "string" || conversationId.trim().length === 0) {
    return { ok: false, code: "INVALID_ARGUMENT", error: "conversationId is required" };
  }
  return { ok: true };
}

/**
 * 统一内存状态缓存键格式。
 */
export function buildStateKey(userId: string, conversationId: string): string {
  return `${userId}_${conversationId}`;
}

/**
 * 统一会话标题截断规则，保持现有前端体验一致。
 */
export function generateConversationTitle(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return "新对话";
  }

  const maxLength = 20;
  let title = firstMessage.trim();
  if (title.length > maxLength) {
    title = title.substring(0, maxLength) + "...";
  }
  return title;
}

/**
 * 安全解析持久化状态，脏数据不应影响接口主流程。
 */
export function parseStateData(raw: string | null | undefined): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
