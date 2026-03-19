import type { AgentState } from "@prisma/client";
import { BaseRepository } from "./base.repository";

export class AgentStateRepository extends BaseRepository<AgentState> {
  constructor(prisma: any) {
    super(prisma, "agentState");
  }

  async findByUserConversation(userId: string, conversationId: string): Promise<AgentState | null> {
    // `(userId, conversationId)` 是会话状态的唯一定位键。
    return this.prisma.agentState.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });
  }

  async upsertState(userId: string, conversationId: string, stateData: string): Promise<AgentState> {
    // 使用 upsert 保证同一会话重复提交时幂等。
    return this.prisma.agentState.upsert({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      create: {
        userId,
        conversationId,
        stateData,
      },
      update: {
        stateData,
      },
    });
  }

  async deleteByUserConversation(userId: string, conversationId: string): Promise<number> {
    // 返回删除条数，供上层判断是“未找到”还是“删除成功”。
    const result = await this.prisma.agentState.deleteMany({
      where: {
        userId,
        conversationId,
      },
    });
    return result.count;
  }
}
