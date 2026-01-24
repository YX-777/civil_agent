/**
 * 定时任务调度器入口文件
 */

import * as cron from "node-cron";
import { logger } from "@civil-agent/core";
import { getSchedulerConfig, validateSchedulerConfig } from "./config/scheduler.config";
import { getAllCronJobs } from "./config/cron.config";
import { setupProcessors } from "./queue/processors";
import { closeTaskQueue } from "./queue/bull-queue";
import { PushNotificationService } from "./notification/push-notification";
import { morningGreetingJob } from "./jobs/morning-greeting";
import { eveningReviewJob } from "./jobs/evening-review";
import { anomalyCheckJob } from "./jobs/anomaly-check";

export class Scheduler {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const config = getSchedulerConfig();

    if (!validateSchedulerConfig(config)) {
      logger.error("Invalid scheduler configuration");
      throw new Error("Invalid scheduler configuration");
    }

    if (!config.enabled) {
      logger.warn("Scheduler is disabled");
      return;
    }

    await setupProcessors();
    logger.info("Scheduler initialized");
  }

  start(): void {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    const config = getSchedulerConfig();
    const cronJobs = getAllCronJobs();

    for (const jobConfig of cronJobs) {
      const task = cron.schedule(
        jobConfig.expression,
        async () => {
          logger.info(`Cron job triggered: ${jobConfig.name}`);
          await this.executeJob(jobConfig.name);
        },
        {
          timezone: config.timezone,
        }
      );

      this.cronJobs.set(jobConfig.name, task);
      logger.info(`Scheduled job: ${jobConfig.name} (${jobConfig.expression})`);
    }

    this.isRunning = true;
    logger.info("Scheduler started");
    logger.info("- 早安问候: 每天 8:00");
    logger.info("- 晚间复盘: 每天 22:00");
    logger.info("- 异常检测: 每天 23:59");
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn("Scheduler is not running");
      return;
    }

    for (const [name, task] of this.cronJobs) {
      task.stop();
      logger.info(`Stopped job: ${name}`);
    }

    this.cronJobs.clear();
    this.isRunning = false;
    logger.info("Scheduler stopped");
  }

  private async executeJob(jobName: string): Promise<void> {
    const { triggerMorningGreeting, triggerEveningReview, triggerAnomalyCheck } =
      await import("./queue/processors");

    try {
      switch (jobName) {
        case "morning-greeting":
          await triggerMorningGreeting();
          break;
        case "evening-review":
          await triggerEveningReview();
          break;
        case "anomaly-check":
          await triggerAnomalyCheck();
          break;
        default:
          logger.warn(`Unknown job: ${jobName}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to execute job: ${jobName}`, err);
    }
  }

  async shutdown(): Promise<void> {
    this.stop();
    await closeTaskQueue();
    logger.info("Scheduler shutdown complete");
  }
}

export * from "./config/cron.config";
export * from "./config/scheduler.config";
export * from "./notification/push-notification";
export * from "./jobs/morning-greeting";
export * from "./jobs/evening-review";
export * from "./jobs/anomaly-check";
export * from "./queue/bull-queue";
export * from "./queue/processors";

export async function main(): Promise<void> {
  const scheduler = new Scheduler();

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down...");
    await scheduler.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down...");
    await scheduler.shutdown();
    process.exit(0);
  });

  scheduler.start();

  logger.info("Scheduler is running. Press Ctrl+C to stop.");
}

if (require.main === module) {
  main().catch((error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Fatal error in main()", err);
    process.exit(1);
  });
}