/**
 * 推送通知
 */

import axios from "axios";
import { logger } from "@civil-agent/core";
import { getSchedulerConfig } from "../config/scheduler.config";

export interface PushNotificationData {
  userId: string;
  title: string;
  content: string;
  quickReplies?: Array<{
    id: string;
    text: string;
    action: string;
  }>;
}

export class PushNotificationService {
  private config = getSchedulerConfig();

  async send(data: PushNotificationData): Promise<boolean> {
    if (!this.config.pushService.key) {
      logger.warn("Push service key not configured, skipping notification");
      return false;
    }

    try {
      const response = await axios.post(
        this.config.pushService.url,
        {
          key: this.config.pushService.key,
          userId: data.userId,
          title: data.title,
          content: data.content,
          quickReplies: data.quickReplies || [],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      logger.info(`Push notification sent to user ${data.userId}`);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to send push notification", err);
      return false;
    }
  }

  async sendBatch(notifications: PushNotificationData[]): Promise<number> {
    const results = await Promise.all(
      notifications.map((notification) => this.send(notification))
    );

    const successCount = results.filter((result) => result).length;
    logger.info(
      `Sent ${successCount}/${notifications.length} push notifications`
    );

    return successCount;
  }
}