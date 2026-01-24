/**
 * 任务处理器
 */

import { logger } from "@civil-agent/core";
import { getTaskQueue } from "./bull-queue";
import { morningGreetingJob, getAllActiveUsers } from "../jobs/morning-greeting";
import { eveningReviewJob, getTodayStats } from "../jobs/evening-review";
import { anomalyCheckJob, getAllUsersAnomalies } from "../jobs/anomaly-check";
import { getCronJobConfig } from "../config/cron.config";

export async function setupProcessors(): Promise<void> {
  const queue = getTaskQueue();

  queue.process("morning-greeting", 10, async (job) => {
    logger.info(`Processing morning-greeting job: ${job.id}`);
    await morningGreetingJob(job.data);
  });

  queue.process("evening-review", 10, async (job) => {
    logger.info(`Processing evening-review job: ${job.id}`);
    await eveningReviewJob(job.data);
  });

  queue.process("anomaly-check", 5, async (job) => {
    logger.info(`Processing anomaly-check job: ${job.id}`);
    await anomalyCheckJob(job.data);
  });

  logger.info("Job processors registered");
}

export async function triggerMorningGreeting(): Promise<void> {
  const config = getCronJobConfig("morning-greeting");
  if (!config) {
    logger.error("Morning greeting job config not found");
    return;
  }

  const users = await getAllActiveUsers();

  for (const user of users) {
    await getTaskQueue().add("morning-greeting", user, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }

  logger.info(`Triggered morning greeting for ${users.length} users`);
}

export async function triggerEveningReview(): Promise<void> {
  const config = getCronJobConfig("evening-review");
  if (!config) {
    logger.error("Evening review job config not found");
    return;
  }

  const userIds = ["user-1", "user-2"];

  for (const userId of userIds) {
    const stats = await getTodayStats(userId);
    await getTaskQueue().add("evening-review", stats, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }

  logger.info(`Triggered evening review for ${userIds.length} users`);
}

export async function triggerAnomalyCheck(): Promise<void> {
  const config = getCronJobConfig("anomaly-check");
  if (!config) {
    logger.error("Anomaly check job config not found");
    return;
  }

  const anomalies = await getAllUsersAnomalies();

  for (const anomaly of anomalies) {
    await getTaskQueue().add("anomaly-check", anomaly, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }

  logger.info(`Triggered anomaly check for ${anomalies.length} users with anomalies`);
}