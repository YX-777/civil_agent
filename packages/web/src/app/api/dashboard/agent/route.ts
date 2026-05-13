/**
 * Agent 系统看板 API
 *
 * 聚合四个维度的数据，对应 Dashboard 页四个 Panel：
 *  ① memoryLayers   — 四阶分层记忆条数 + 分布
 *  ② ragStats       — RAG 检索三路命中分布（vector/bm25/web）
 *  ③ nodeStats      — LangGraph 各意图调用次数
 *  ④ recentEvents   — 最近 N 条 Agent 事件流水
 *
 * 数据源：
 *  - SQLite: short_term_memories / meta_memories / conversations / messages / agent_event_log
 *  - ChromaDB: long_term_memory / tech_knowledge collection count
 *
 * 注意：agent_event_log 表如未 migrate，会被静默兜底为空数组（不影响其他面板）。
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPrismaClient,
  getVectorDBService,
  getShortTermMemoryRepository,
  getMetaMemoryRepository,
} from "@tech-mate/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

interface AgentEventRow {
  id: string;
  eventType: string;
  eventName: string;
  payloadJson: string | null;
  durationMs: number | null;
  createdAt: Date;
  conversationId: string | null;
}

async function fetchEventLog(userId: string, limit: number): Promise<AgentEventRow[]> {
  // 用原生查询兜底 — 表如果不存在直接返回 []
  try {
    const prisma: any = getPrismaClient();
    if (!prisma.agentEventLog) return [];
    return await prisma.agentEventLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    const prisma = getPrismaClient();
    const vectorService = getVectorDBService();
    await vectorService.initialize();

    // ============ ① 四阶分层记忆 ============
    const shortRepo = getShortTermMemoryRepository();
    const metaRepo = getMetaMemoryRepository();

    const [shortActive, shortAll, metaRecord, longAllDocs, kbDocs] = await Promise.all([
      shortRepo.findActiveByUserId(userId, 200).catch(() => [] as any[]),
      prisma.shortTermMemory.count({ where: { userId } }).catch(() => 0),
      metaRepo.findByUserId(userId).catch(() => null),
      vectorService.getAllDocuments("long_term_memory").catch(() => []),
      vectorService.getAllDocuments("tech_knowledge").catch(() => []),
    ]);

    // 长期记忆按 user 过滤
    const longUser = longAllDocs.filter((d: any) => d.metadata?.user_id === userId);

    // 短期记忆新鲜度分布（0.0-0.3 / 0.3-0.7 / 0.7-1.0）
    const freshDist = { low: 0, mid: 0, high: 0 };
    for (const m of shortActive) {
      const f = (m as any).freshnessScore ?? 0;
      if (f < 0.3) freshDist.low++;
      else if (f < 0.7) freshDist.mid++;
      else freshDist.high++;
    }

    // 长期记忆权重分布
    const weightDist = { low: 0, mid: 0, high: 0 };
    let avgWeight = 0;
    for (const d of longUser) {
      const w = d.metadata?.weight ?? 0.5;
      avgWeight += w;
      if (w < 0.3) weightDist.low++;
      else if (w < 0.7) weightDist.mid++;
      else weightDist.high++;
    }
    if (longUser.length > 0) avgWeight = avgWeight / longUser.length;

    const memoryLayers = {
      instant: { label: "瞬时记忆", count: 0, note: "实时对话状态（不持久化）" },
      short: {
        label: "短期记忆",
        count: shortActive.length,
        total: shortAll,
        note: `活跃 ${shortActive.length} / 总计 ${shortAll}`,
        freshnessDistribution: freshDist,
      },
      long: {
        label: "长期记忆",
        count: longUser.length,
        avgWeight: Number(avgWeight.toFixed(2)),
        weightDistribution: weightDist,
        note: "ChromaDB long_term_memory",
      },
      meta: {
        label: "元记忆",
        count: metaRecord ? 1 : 0,
        note: metaRecord ? "已聚合用户画像" : "尚未生成",
      },
      knowledgeBase: {
        label: "知识库",
        count: kbDocs.length,
        note: "ChromaDB tech_knowledge",
      },
    };

    // ============ ②③④ Agent 事件统计 ============
    const events = await fetchEventLog(userId, 200);

    // RAG 命中分布
    const ragStats = {
      total: 0,
      vector: 0,
      bm25: 0,
      web: 0,
      avgScore: 0,
    };
    let scoreSum = 0;
    let scoreCount = 0;

    // 节点调用统计
    const nodeStatsMap = new Map<string, number>();

    // ============ GuardRail 三层防护统计 ============
    const guardRailStats = {
      total: 0,
      input: { passed: 0, blocked: 0, sanitized: 0 },
      tool: { passed: 0, blocked: 0 },
      output: { passed: 0, hits: 0, avgSimilarity: 0, avgFactCoverage: 0 },
      recentHits: [] as Array<{ layer: string; risk: string; reason: string; time: string }>,
    };
    let outSimSum = 0;
    let outSimCount = 0;
    let outFactSum = 0;
    let outFactCount = 0;

    for (const e of events) {
      if (e.eventType === "guardrail") {
        guardRailStats.total++;
        try {
          const p = e.payloadJson ? JSON.parse(e.payloadJson) : {};
          const layer = p.layer || "input";
          const action = p.action;

          if (layer === "input") {
            if (action === "block") guardRailStats.input.blocked++;
            else if (action === "sanitize") guardRailStats.input.sanitized++;
            else guardRailStats.input.passed++;
          } else if (layer === "tool") {
            if (action === "block") guardRailStats.tool.blocked++;
            else guardRailStats.tool.passed++;
          } else if (layer === "output") {
            if (Array.isArray(p.hits) && p.hits.length === 0) guardRailStats.output.passed++;
            else guardRailStats.output.hits += (p.hits?.length || 0);
            if (typeof p.similarity === "number") {
              outSimSum += p.similarity;
              outSimCount++;
            }
            if (typeof p.factCoverage === "number") {
              outFactSum += p.factCoverage;
              outFactCount++;
            }
          }

          // 收集风险事件用于"最近告警"
          if (Array.isArray(p.hits) && p.hits.length > 0) {
            for (const h of p.hits) {
              guardRailStats.recentHits.push({
                layer,
                risk: h.risk || "low",
                reason: h.reason || "",
                time: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
              });
            }
          }
        } catch {
          /* ignore parse */
        }
      }
      if (e.eventType === "rag") {
        ragStats.total++;
        try {
          const p = e.payloadJson ? JSON.parse(e.payloadJson) : {};
          if (typeof p.vectorCount === "number") ragStats.vector += p.vectorCount;
          if (typeof p.bm25Count === "number") ragStats.bm25 += p.bm25Count;
          if (typeof p.webCount === "number") ragStats.web += p.webCount;
          if (typeof p.avgScore === "number") {
            scoreSum += p.avgScore;
            scoreCount++;
          }
        } catch { /* ignore */ }
      } else if (e.eventType === "node") {
        // 只统计真实跑过的 node（4 个：general_qa / task_generation / progress_query / emotion_support）。
        // 不再混入 eventType=intent —— 那是"上游分类"维度，混进来会导致同一轮被双计
        // 且 eventName 不同（intent=general_inquiry vs node=general_qa）造成假重复条目。
        const name = e.eventName || "unknown";
        nodeStatsMap.set(name, (nodeStatsMap.get(name) || 0) + 1);
      }
    }

    if (scoreCount > 0) ragStats.avgScore = Number((scoreSum / scoreCount).toFixed(3));
    if (outSimCount > 0) guardRailStats.output.avgSimilarity = Number((outSimSum / outSimCount).toFixed(3));
    if (outFactCount > 0) guardRailStats.output.avgFactCoverage = Number((outFactSum / outFactCount).toFixed(3));
    guardRailStats.recentHits = guardRailStats.recentHits.slice(0, 10);

    const nodeStats = Array.from(nodeStatsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 最近事件流水（前 20 条）
    const recentEvents = events.slice(0, 20).map((e) => ({
      id: e.id,
      type: e.eventType,
      name: e.eventName,
      payload: e.payloadJson ? safeJson(e.payloadJson) : null,
      durationMs: e.durationMs,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
      conversationId: e.conversationId,
    }));

    // ============ 全局统计 ============
    const [conversationCount, messageCount] = await Promise.all([
      prisma.conversation.count({ where: { userId } }).catch(() => 0),
      prisma.message.count({ where: { conversation: { userId } } }).catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      overview: {
        conversationCount,
        messageCount,
        eventCount: events.length,
      },
      memoryLayers,
      ragStats,
      guardRailStats,
      nodeStats,
      recentEvents,
      _meta: {
        eventTableReady: events.length > 0 || !!(getPrismaClient() as any).agentEventLog,
      },
    });
  } catch (error) {
    console.error("Failed to fetch agent dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}
