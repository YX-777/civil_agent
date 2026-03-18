#!/usr/bin/env node
/**
 * 小红书 MCP 启动后校验脚本
 * 仅负责：
 * 1) 初始化工具
 * 2) 检查登录状态（未登录立即失败）
 * 3) 拉取首页推荐并打印前三条
 * 任一步失败立即退出，不继续执行
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { getXiaohongshuMCPClient } from './dist/client/xiaohongshu-client.js';

function fail(message, details) {
  console.error(`\n❌ ${message}`);
  if (details) {
    console.error(details);
  }
  console.error('\n请先修复问题后重试。');
  process.exit(1);
}

function parseMaybeJson(payload) {
  if (payload == null) return payload;
  if (typeof payload === 'object') return payload;
  if (typeof payload !== 'string') return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function findBooleanSignals(value, keys, out) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => findBooleanSignals(item, keys, out));
    return;
  }

  if (typeof value !== 'object') return;

  for (const [k, v] of Object.entries(value)) {
    const lowered = k.toLowerCase();
    if (keys.some((key) => lowered.includes(key))) {
      if (typeof v === 'boolean') {
        out.push(v);
      }
      if (typeof v === 'string') {
        if (v.includes('已登录') || v.toLowerCase().includes('logged in') || v.toLowerCase() === 'true') {
          out.push(true);
        }
        if (v.includes('未登录') || v.toLowerCase().includes('not logged in') || v.toLowerCase() === 'false') {
          out.push(false);
        }
      }
      if (typeof v === 'number') {
        if (v === 1) out.push(true);
        if (v === 0) out.push(false);
      }
    }

    findBooleanSignals(v, keys, out);
  }
}

function evaluateLoginStatus(loginResult) {
  const normalized = parseMaybeJson(loginResult);
  if (normalized == null) {
    return {
      loggedIn: false,
      reason: '登录状态检查失败：返回为空。',
      normalized,
    };
  }

  const loginSignals = [];
  findBooleanSignals(normalized, ['login', 'logged', 'auth', 'signin'], loginSignals);

  const text = typeof normalized === 'string' ? normalized : JSON.stringify(normalized);
  if (text.includes('未登录') || text.toLowerCase().includes('not logged in')) {
    return {
      loggedIn: false,
      reason: '登录状态未通过：当前账号未登录。',
      normalized,
    };
  }

  if (loginSignals.includes(false)) {
    return {
      loggedIn: false,
      reason: '登录状态未通过：检测到未登录信号。',
      normalized,
    };
  }

  if (loginSignals.includes(true) || text.includes('已登录') || text.toLowerCase().includes('logged in')) {
    return {
      loggedIn: true,
      reason: '登录状态检测通过（已登录）',
      normalized,
    };
  }

  return {
    loggedIn: false,
    reason: '登录状态无法确认：返回结果中未识别到“已登录”信号。',
    normalized,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectUrls(value, out) {
  if (value == null) return;

  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/g);
    if (matches) {
      out.push(...matches);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, out));
    return;
  }

  if (typeof value !== 'object') return;

  for (const [key, val] of Object.entries(value)) {
    const lowered = key.toLowerCase();
    if (
      lowered.includes('qr') ||
      lowered.includes('qrcode') ||
      lowered.includes('qr_code') ||
      lowered.includes('url')
    ) {
      collectUrls(val, out);
    } else {
      collectUrls(val, out);
    }
  }
}

function extractQrUrl(qrResult) {
  const normalized = parseMaybeJson(qrResult);
  const urls = [];
  collectUrls(normalized, urls);
  if (urls.length === 0) return null;
  return urls[0];
}

function extractDataImageUrl(value) {
  if (value == null) return null;

  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) {
      return value;
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractDataImageUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  for (const val of Object.values(value)) {
    const found = extractDataImageUrl(val);
    if (found) return found;
  }

  return null;
}

function openBrowser(url) {
  if (!url) return false;

  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    const p = spawn(cmd, [url], {
      stdio: 'ignore',
      detached: true,
    });
    p.unref();
    return true;
  } catch {
    return false;
  }
}

async function openDataImageInBrowser(dataImageUrl) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>小红书登录二维码</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      img { width: 320px; height: 320px; border: 1px solid #ddd; border-radius: 8px; }
      p { color: #555; }
    </style>
  </head>
  <body>
    <h1>小红书扫码登录</h1>
    <p>请使用小红书 App 扫码登录。</p>
    <img src="${dataImageUrl}" alt="小红书登录二维码" />
  </body>
</html>`;

  const filePath = path.join(os.tmpdir(), 'xiaohongshu-login-qrcode.html');
  await writeFile(filePath, html, 'utf8');
  const opened = openBrowser(filePath);
  return { opened, filePath };
}

function extractFeeds(feedsResult) {
  const normalized = parseMaybeJson(feedsResult);
  if (normalized == null) return [];
  if (Array.isArray(normalized)) return normalized;
  if (Array.isArray(normalized?.data?.items)) return normalized.data.items;
  if (Array.isArray(normalized?.items)) return normalized.items;
  if (Array.isArray(normalized?.data?.feeds)) return normalized.data.feeds;
  if (Array.isArray(normalized?.feeds)) return normalized.feeds;
  return [];
}

function printTop3(feeds) {
  const top3 = feeds.slice(0, 3);
  if (top3.length < 3) {
    fail(`首页推荐数量不足 3 条，实际仅 ${top3.length} 条。`);
  }

  console.log('\n📋 首页推荐（前 3 条）');
  top3.forEach((feed, index) => {
    const note = feed?.noteCard || feed?.note_card || feed;
    const title = note?.displayTitle || note?.display_title || note?.title || '无标题';
    const author = note?.user?.nickname || note?.user?.nickName || note?.author?.name || '未知作者';
    const like = note?.interactInfo?.likedCount || note?.interact_info?.liked_count || note?.likeCount || 0;
    const comment = note?.interactInfo?.commentCount || note?.interact_info?.comment_count || note?.commentCount || 0;
    const collect = note?.interactInfo?.collectedCount || note?.interact_info?.collected_count || note?.collectCount || 0;

    console.log(`\n${index + 1}. ${title}`);
    console.log(`   作者: ${author}`);
    console.log(`   点赞: ${like}  评论: ${comment}  收藏: ${collect}`);
  });
}

async function main() {
  console.log('='.repeat(64));
  console.log('🚀 小红书 MCP 启动后校验');
  console.log('='.repeat(64));

  const client = getXiaohongshuMCPClient();

  try {
    console.log('\n[1/3] 初始化 MCP 工具...');
    const tools = await client.getTools();
    if (!Array.isArray(tools) || tools.length === 0) {
      fail('初始化失败：未获取到任何 MCP 工具。');
    }
    console.log(`✅ 工具初始化成功，共 ${tools.length} 个工具`);

    const checkLoginTool = tools.find((t) => t.name === 'check_login_status');
    if (!checkLoginTool) {
      fail('初始化失败：缺少 `check_login_status` 工具。');
    }

    const getLoginQrcodeTool = tools.find((t) => t.name === 'get_login_qrcode');
    if (!getLoginQrcodeTool) {
      fail('初始化失败：缺少 `get_login_qrcode` 工具。');
    }

    const listFeedsTool = tools.find((t) => t.name === 'list_feeds');
    if (!listFeedsTool) {
      fail('初始化失败：缺少 `list_feeds` 工具。');
    }

    console.log('\n[2/3] 检测登录状态...');
    let loginResult = await checkLoginTool.invoke({});
    let loginStatus = evaluateLoginStatus(loginResult);

    if (!loginStatus.loggedIn) {
      console.warn(`⚠️  ${loginStatus.reason}`);
      console.warn('正在尝试获取登录二维码并自动打开浏览器...');

      let qrOpenOk = false;
      try {
        const qrResult = await getLoginQrcodeTool.invoke({});
        const normalizedQr = parseMaybeJson(qrResult);
        const qrUrl = extractQrUrl(qrResult);

        if (qrUrl) {
          qrOpenOk = openBrowser(qrUrl);
          if (qrOpenOk) {
            console.warn(`已打开浏览器登录页：${qrUrl}`);
          } else {
            console.warn(`浏览器自动打开失败，请手动打开：${qrUrl}`);
          }
        } else {
          const dataImageUrl = extractDataImageUrl(normalizedQr);
          if (dataImageUrl) {
            const { opened, filePath } = await openDataImageInBrowser(dataImageUrl);
            if (opened) {
              qrOpenOk = true;
              console.warn(`已打开浏览器二维码页面：${filePath}`);
            } else {
              console.warn(`浏览器自动打开失败，请手动打开二维码页面：${filePath}`);
            }
          } else {
            console.warn('未从二维码返回中解析到可打开内容，请手动执行 get_login_qrcode 查看。');
          }
        }
      } catch (qrError) {
        const msg = qrError instanceof Error ? qrError.message : String(qrError);
        console.warn(`获取登录二维码失败：${msg}`);
      }

      console.warn('请在浏览器完成扫码，脚本等待 10 秒后结束本次执行。');
      await sleep(10000);
      fail(loginStatus.reason, JSON.stringify(loginStatus.normalized, null, 2));
    }

    console.log('✅ 登录状态检测通过（已登录）');

    console.log('\n[3/3] 获取首页推荐列表并输出前三条...');
    const feedsResult = await listFeedsTool.invoke({ page: 1 });
    const feeds = extractFeeds(feedsResult);
    if (feeds.length === 0) {
      fail('获取推荐列表失败：返回列表为空。', JSON.stringify(parseMaybeJson(feedsResult), null, 2));
    }
    printTop3(feeds);

    console.log('\n✅ 所有校验通过，流程完成。');
  } catch (error) {
    if (error instanceof Error) {
      fail('执行失败。', `${error.message}\n${error.stack || ''}`);
    }
    fail('执行失败。', String(error));
  } finally {
    try {
      await client.close();
    } catch {
      // ignore close error
    }
  }
}

main();
