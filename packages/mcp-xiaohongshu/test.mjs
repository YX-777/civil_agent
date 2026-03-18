#!/usr/bin/env node
/**
 * 小红书 MCP 工具测试脚本 - 使用 MultiServerMCPClient
 */

import 'dotenv/config';
import { getXiaohongshuMCPClient } from './dist/client/xiaohongshu-client.js';

async function testXiaohongshuMCP() {
  console.log('='.repeat(60));
  console.log('🔍 小红书 MCP 工具测试 (MultiServerMCPClient)');
  console.log('='.repeat(60));
  console.log('');

  try {
    console.log('📝 测试 1: 获取小红书工具...');
    const client = getXiaohongshuMCPClient();
    const tools = await client.getTools();
    console.log(`✅ 成功获取 ${tools.length} 个工具`);
    console.log('');
    
    tools.forEach((tool, index) => {
      console.log(`工具 ${index + 1}:`);
      console.log(`  名称: ${tool.name}`);
      console.log(`  描述: ${tool.description}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('');

    console.log('📝 测试 2: 检查登录状态...');
    const checkLoginTool = tools.find(t => t.name === 'check_login_status');
    if (checkLoginTool) {
      const loginResult = await checkLoginTool.invoke({});
      console.log('✅ 登录状态:', JSON.stringify(loginResult, null, 2));
    } else {
      console.log('❌ 未找到 check_login_status 工具');
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('');

    console.log('📝 测试 3: 获取推荐列表...');
    const listFeedsTool = tools.find(t => t.name === 'list_feeds');
    if (listFeedsTool) {
      const feedsResult = await listFeedsTool.invoke({ page: 1 });
      console.log('✅ 推荐列表:', JSON.stringify(feedsResult, null, 2));
    } else {
      console.log('❌ 未找到 list_feeds 工具');
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('');

    console.log('📝 测试 4: 搜索内容...');
    const searchFeedsTool = tools.find(t => t.name === 'search_feeds');
    if (searchFeedsTool) {
      const searchResult = await searchFeedsTool.invoke({ keyword: '考公经验' });
      console.log('✅ 搜索结果:', JSON.stringify(searchResult, null, 2));
    } else {
      console.log('❌ 未找到 search_feeds 工具');
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ 所有测试完成');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testXiaohongshuMCP();
