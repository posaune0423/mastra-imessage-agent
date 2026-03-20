import { IMessageSDK } from "@photon-ai/imessage-kit";
import { generalAgent } from "./agent";
import { injectSendFn } from "./agent/tools";
import { injectAddReminder } from "./agent/tools/set-reminder";
import { heartbeatStateStore } from "./agent/heartbeat/state";
import { HeartbeatEngine } from "./agent/heartbeat/engine";
import { env } from "./env";
import { normalizePhone } from "./utils/phone";
import { logger } from "./utils/logger";
import { WATCHER_CONFIG, THREAD } from "./agent/config";

// ─── SDK 初期化 ────────────────────────────────────────────
const sdk = new IMessageSDK({
  watcher: WATCHER_CONFIG,
});

// ─── 依存関係の注入（循環依存を避けるため起動時に注入）──────────
const sendFn = async (to: string, text: string) => {
  await sdk.send(to, text);
};
injectSendFn(sendFn);
injectAddReminder(async (reminder) => {
  await heartbeatStateStore.addReminder(reminder);
});

// ─── Heartbeat 初期化 ──────────────────────────────────────
await heartbeatStateStore.init();
const heartbeat = new HeartbeatEngine(sdk, generalAgent, env.OWNER_PHONE);

// ─── iMessage ハンドラ ─────────────────────────────────────
await sdk.startWatching({
  onDirectMessage: async (msg) => {
    const sender = normalizePhone(msg.sender);
    if (sender !== env.OWNER_PHONE) {
      logger.debug(`Ignored message from ${msg.sender}`);
      return;
    }

    const text = msg.text ?? "";
    if (!text.trim()) return;

    logger.info(`<- ${sender}: ${text}`);

    try {
      const result = await generalAgent.generate(text, {
        memory: {
          resource: sender,
          thread: THREAD.default,
        },
      });

      const reply = result.text;
      await sdk.send(msg.sender, reply);
      logger.info(`-> ${sender}: ${reply}`);
    } catch (err) {
      logger.error("Agent error:", err);
      await sdk.send(msg.sender, "エラーが発生しました。もう一度お試しください。");
    }
  },

  onError: (err) => {
    logger.error("Watcher error:", err);
  },
});

// ─── Heartbeat 開始 ────────────────────────────────────────
heartbeat.start(env.HEARTBEAT_INTERVAL_MS);

logger.info("Agent started. Waiting for messages...");
logger.info(`  Owner phone: ${env.OWNER_PHONE}`);
logger.info(`  Heartbeat interval: ${String(env.HEARTBEAT_INTERVAL_MS / 1000)}s`);

// ─── Graceful Shutdown ─────────────────────────────────────
const shutdown = (): void => {
  logger.info("Shutting down...");
  heartbeat.stop();
  sdk.stopWatching();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
