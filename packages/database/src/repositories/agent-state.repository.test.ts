import assert from "node:assert/strict";
import test from "node:test";
import { AgentStateRepository } from "./agent-state.repository";

function createMockPrisma() {
  const calls: Record<string, any[]> = {
    findUnique: [],
    upsert: [],
    deleteMany: [],
  };

  const prisma = {
    agentState: {
      findUnique: async (args: any) => {
        calls.findUnique.push(args);
        return {
          id: "as_1",
          userId: args.where.userId_conversationId.userId,
          conversationId: args.where.userId_conversationId.conversationId,
          stateData: "{}",
        };
      },
      upsert: async (args: any) => {
        calls.upsert.push(args);
        return {
          id: "as_2",
          userId: args.create.userId,
          conversationId: args.create.conversationId,
          stateData: args.create.stateData,
        };
      },
      deleteMany: async (args: any) => {
        calls.deleteMany.push(args);
        return { count: 1 };
      },
    },
  };

  return { prisma, calls };
}

test("findByUserConversation uses composite key query", async () => {
  const { prisma, calls } = createMockPrisma();
  const repo = new AgentStateRepository(prisma as any);

  const row = await repo.findByUserConversation("u1", "c1");
  assert.equal(row?.userId, "u1");
  assert.equal(row?.conversationId, "c1");
  assert.deepEqual(calls.findUnique[0], {
    where: {
      userId_conversationId: {
        userId: "u1",
        conversationId: "c1",
      },
    },
  });
});

test("upsertState writes both create/update payloads", async () => {
  const { prisma, calls } = createMockPrisma();
  const repo = new AgentStateRepository(prisma as any);

  const stateData = JSON.stringify({ userId: "u2", messages: [] });
  const row = await repo.upsertState("u2", "c2", stateData);

  assert.equal(row?.userId, "u2");
  assert.equal(row?.conversationId, "c2");
  assert.equal(row?.stateData, stateData);
  assert.deepEqual(calls.upsert[0], {
    where: {
      userId_conversationId: {
        userId: "u2",
        conversationId: "c2",
      },
    },
    create: {
      userId: "u2",
      conversationId: "c2",
      stateData,
    },
    update: {
      stateData,
    },
  });
});

test("deleteByUserConversation returns deleted row count", async () => {
  const { prisma, calls } = createMockPrisma();
  const repo = new AgentStateRepository(prisma as any);

  const count = await repo.deleteByUserConversation("u3", "c3");
  assert.equal(count, 1);
  assert.deepEqual(calls.deleteMany[0], {
    where: {
      userId: "u3",
      conversationId: "c3",
    },
  });
});
