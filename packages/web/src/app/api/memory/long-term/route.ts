/**
 * 长期记忆 API
 * GET    /api/memory/long-term?userId=xxx   — 列出该用户全部长期记忆
 * DELETE /api/memory/long-term?userId=xxx&id=lm_xxx — 删除单条
 *
 * 数据源：ChromaDB collection "long_term_memory"
 * 每条 metadata 含：user_id / memory_id / content_type / weight / topics / access_count / creation_date / last_accessed
 */

import { NextRequest, NextResponse } from "next/server";
import { getVectorDBService } from "@tech-mate/database";

const COLLECTION = "long_term_memory";
const DEFAULT_USER_ID = "default-user";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    const vectorService = getVectorDBService();
    await vectorService.initialize();

    const all = await vectorService.getAllDocuments(COLLECTION);

    // 过滤出当前用户的记忆
    const userMemories = all
      .filter((doc) => doc.metadata?.user_id === userId)
      .map((doc) => {
        const meta = doc.metadata || {};
        let topics: string[] = [];
        if (Array.isArray(meta.topics)) topics = meta.topics;
        else if (typeof meta.topics === "string") {
          try { topics = JSON.parse(meta.topics); } catch { topics = [meta.topics]; }
        }

        return {
          id: doc.id,
          content: doc.content,
          contentType: meta.content_type || "message",
          weight: typeof meta.weight === "number" ? meta.weight : 0.5,
          accessCount: meta.access_count || 0,
          topics,
          creationDate: meta.creation_date || null,
          lastAccessed: meta.last_accessed || null,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    return NextResponse.json({
      success: true,
      total: userMemories.length,
      memories: userMemories,
    });
  } catch (error) {
    console.error("Failed to fetch long-term memories:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim();
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const vectorService = getVectorDBService();
    await vectorService.initialize();

    // 安全校验：确认这条记忆属于该 user
    const target = await vectorService.get(COLLECTION, id);
    if (!target) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    if (target.metadata?.user_id && target.metadata.user_id !== userId) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await vectorService.delete(COLLECTION, id);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete long-term memory:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
