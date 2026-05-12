/**
 * GET /api/observability/trace?conversationId=xxx&limit=200
 *
 * 读 logs/traces/{conversationId}.jsonl 给 Dashboard Trace Viewer 用。
 * 也支持 ?list=1 列出所有有 trace 的会话 ID。
 */

import { NextRequest, NextResponse } from "next/server";
import { readTraceForConversation, listTracedConversations } from "@tech-mate/agent-langgraph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list");

  if (list === "1") {
    return NextResponse.json({ success: true, conversations: listTracedConversations() });
  }

  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }
  const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get("limit") || "200", 10)));
  const spans = readTraceForConversation(conversationId, limit);

  // 按 traceId 聚合（一个会话可能有多次 chat turn）
  const groups: Record<string, any[]> = {};
  for (const s of spans) {
    const key = s.traceId || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const traces = Object.entries(groups).map(([traceId, spanList]) => {
    const sorted = [...spanList].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    const root = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      traceId,
      startTime: root?.startTime,
      endTime: last?.endTime,
      totalMs: last?.endTime && root?.startTime ? last.endTime - root.startTime : null,
      spanCount: sorted.length,
      conversationId: root?.conversationId,
      userId: root?.userId,
      spans: sorted,
    };
  }).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

  return NextResponse.json({ success: true, conversationId, totalSpans: spans.length, traces });
}
