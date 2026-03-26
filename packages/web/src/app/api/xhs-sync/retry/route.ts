import { NextRequest, NextResponse } from "next/server";
import { promisify } from "node:util";
import path from "node:path";
import { execFile } from "node:child_process";
import { initializeDatabase } from "@civil-agent/database";
import { retrySingleXhsPost } from "@civil-agent/scheduler";

const execFileAsync = promisify(execFile);

async function isXiaohongshuMcpReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    // 这里只做“服务是否在监听”的轻量探测，不要求返回 200。
    await fetch("http://127.0.0.1:18060/mcp", {
      method: "GET",
      signal: controller.signal,
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // GET /mcp 返回 405 也说明服务端已正常监听，不应误判为不可达。
    if (message.includes("405")) {
      return true;
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureXiaohongshuMcpReady(): Promise<void> {
  if (await isXiaohongshuMcpReachable()) {
    return;
  }

  // Web 侧手动重试不要求用户先手动拉起 MCP，
  // 若发现服务没起来，就尝试用包内脚本自动拉起。
  const scriptPath = path.resolve(process.cwd(), "..", "mcp-xiaohongshu", "start.sh");
  await execFileAsync(scriptPath, {
    cwd: path.dirname(scriptPath),
    timeout: 120000,
  });

  if (!(await isXiaohongshuMcpReachable())) {
    throw new Error("xiaohongshu MCP is not reachable after start.sh");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const postId = typeof body?.postId === "string" ? body.postId.trim() : "";

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    // 单条重试会触发数据库写入，但不依赖向量库，所以这里跳过向量初始化，
    // 让页面操作更轻、更快。
    await initializeDatabase({ skipVectorDB: true });
    await ensureXiaohongshuMcpReady();
    const result = await retrySingleXhsPost(postId);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retry xiaohongshu post";
    const status = message.includes("xiaohongshu MCP") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
