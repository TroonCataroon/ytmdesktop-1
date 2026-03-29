/**
 * Slack incoming webhook for bug / crash notifications (main process).
 * Set SLACK_BUG_WEBHOOK_URL to enable; optional overrides for display name and channel.
 */
export const SLACK_BUG_CONFIG = {
  webhookUrl: process.env.SLACK_BUG_WEBHOOK_URL || "",
  username: process.env.SLACK_BUG_USERNAME || "YTM Desktop",
  /** Incoming webhooks can override the default channel when supported */
  channel: process.env.SLACK_BUG_CHANNEL || ""
};

export function isSlackBugNotifyEnabled(): boolean {
  return SLACK_BUG_CONFIG.webhookUrl.length > 0;
}
