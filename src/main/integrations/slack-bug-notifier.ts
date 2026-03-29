import log from "electron-log";
import { SLACK_BUG_CONFIG, isSlackBugNotifyEnabled } from "../../shared/slack.config";
import type { CrashReport } from "./crash-reporter";

const MAX_STACK_CHARS = 3500;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… (truncated)`;
}

/**
 * Fire-and-forget Slack notification for a saved crash report.
 * Does nothing when SLACK_BUG_WEBHOOK_URL is unset.
 */
export function notifySlackBugReport(report: CrashReport, reportFilename: string): void {
  if (!isSlackBugNotifyEnabled()) return;

  const title = `Bug report: ${report.type}`;
  const err = report.error;
  const errSummary = err ? `${err.name}: ${err.message}` : "(no exception attached)";
  const stack = err?.stack ? truncate(err.stack, MAX_STACK_CHARS) : "";
  const ctx =
    report.additionalInfo && typeof report.additionalInfo.context === "string"
      ? String(report.additionalInfo.context)
      : "";

  const payload: Record<string, unknown> = {
    text: `${title} — ${errSummary}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title, emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*App version*\n${report.app.version}` },
          { type: "mrkdwn", text: `*Platform*\n${report.system.platform}` },
          { type: "mrkdwn", text: `*Report file*\n\`${reportFilename}\`` },
          { type: "mrkdwn", text: `*Time (UTC)*\n${report.timestamp}` }
        ]
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Error*\n\`\`\`${truncate(errSummary, 500)}\`\`\`` }
      }
    ]
  };

  if (SLACK_BUG_CONFIG.username) {
    payload.username = SLACK_BUG_CONFIG.username;
  }
  if (SLACK_BUG_CONFIG.channel) {
    payload.channel = SLACK_BUG_CONFIG.channel;
  }

  if (ctx) {
    (payload.blocks as object[]).push({
      type: "section",
      text: { type: "mrkdwn", text: `*Context*\n${truncate(ctx, 500)}` }
    });
  }

  if (stack) {
    (payload.blocks as object[]).push({
      type: "section",
      text: { type: "mrkdwn", text: `*Stack*\n\`\`\`${stack}\`\`\`` }
    });
  }

  void fetch(SLACK_BUG_CONFIG.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) {
        log.warn(`Slack bug webhook failed: ${res.status} ${res.statusText}`);
      }
    })
    .catch(err => {
      log.warn("Slack bug webhook request failed:", err);
    });
}
