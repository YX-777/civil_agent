/**
 * Bull 队列配置
 */

import Queue from "bull";
import { logger } from "@civil-agent/core";
import { getSchedulerConfig } from "../config/scheduler.config";

let taskQueue: Queue.Queue | null = null;

export function getTaskQueue(): Queue.Queue {
  if (taskQueue) {
    return taskQueue;
  }

  const config = getSchedulerConfig();

  taskQueue = new Queue("civil-service-tasks", {
    redis: {
      host: config.queue.connection.host,
      port: config.queue.connection.port,
      db: config.queue.connection.db,
      password: config.queue.connection.password,
    },
    defaultJobOptions: config.queue.defaultJobOptions,
  });

  taskQueue.on("error", (error) => {
    logger.error("Queue error", error);
  });

  taskQueue.on("waiting", (jobId) => {
    logger.debug(`Job ${jobId} is waiting`);
  });

  taskQueue.on("active", (job, jobPromise) => {
    logger.info(`Job ${job.id} started: ${job.name}`);
  });

  taskQueue.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed: ${job.name}`);
  });

  taskQueue.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed: ${job?.name}`, err);
  });

  taskQueue.on("stalled", (job) => {
    logger.warn(`Job ${job.id} stalled: ${job.name}`);
  });

  logger.info("Bull queue initialized");

  return taskQueue;
}

export async function closeTaskQueue(): Promise<void> {
  if (taskQueue) {
    await taskQueue.close();
    taskQueue = null;
    logger.info("Bull queue closed");
  }
}

export async function addJob(
  name: string,
  data: any,
  options?: Queue.JobOptions
): Promise<Queue.Job> {
  const queue = getTaskQueue();
  const job = await queue.add(name, data, options);
  logger.info(`Job ${job.id} added to queue: ${name}`);
  return job;
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getTaskQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}