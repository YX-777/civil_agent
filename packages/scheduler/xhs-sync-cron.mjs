#!/usr/bin/env node
/**
 * 简化版小红书采集定时任务
 * 不依赖 Bull queue 和 Redis，直接调用同步任务
 */

import * as cron from 'node-cron';
import { weeklyXiaohongshuSyncJob } from './dist/jobs/weekly-xiaohongshu-sync.js';
import { logger } from '@civil-agent/core';

const SYNC_CRON_EXPRESSION = '10 11 * * *'; // 每天 11:10

console.log('='.repeat(60));
console.log('🚀 小红书采集定时任务启动');
console.log('='.repeat(60));
console.log('');
console.log(`⏰ 定时配置: 每天 11:10 自动采集`);
console.log('');

// 初始化数据库
import { initializeDatabase } from '@civil-agent/database';
initializeDatabase({ skipVectorDB: true }).then(() => {
  console.log('✅ 数据库初始化完成');

  // 启动定时任务
  const task = cron.schedule(
    SYNC_CRON_EXPRESSION,
    async () => {
      console.log('');
      console.log('='.repeat(60));
      console.log(`[${new Date().toISOString()}] 🔄 定时任务触发: 开始采集`);
      console.log('='.repeat(60));

      try {
        const result = await weeklyXiaohongshuSyncJob({ limit: 50 });
        console.log('');
        console.log('📊 采集结果:');
        console.log(`  fetchedCount: ${result.fetchedCount}`);
        console.log(`  insertedCount: ${result.insertedCount}`);
        console.log(`  dedupedPostIdCount: ${result.dedupedPostIdCount}`);
        console.log(`  failedCount: ${result.failedCount}`);
        console.log('');
        console.log('✅ 采集完成');
      } catch (error) {
        console.error('❌ 采集失败:', error);
      }
    },
    {
      timezone: 'Asia/Shanghai',
    }
  );

  console.log('✅ 定时任务已注册');
  console.log('');
  console.log('💡 提示:');
  console.log('   - 按 Ctrl+C 停止服务');
  console.log('   - 查看日志: tail -f /tmp/xhs-sync-cron.log');
  console.log('   - 手动触发: node dist/jobs/weekly-xiaohongshu-sync.js');
  console.log('');
  console.log('🎉 服务启动完成，等待定时触发...');
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 收到停止信号，正在关闭...');
  task.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('🛑 收到停止信号，正在关闭...');
  task.stop();
  process.exit(0);
});