import { IMessageSDK } from "@photon-ai/imessage-kit";
import { generalAgent } from "./agent";
import { injectSendFn } from "./agent/tools";
import { injectAddReminder } from "./agent/tools/set-reminder";
import { heartbeatStateStore } from "./agent/heartbeat/state";
import { HeartbeatEngine } from "./agent/heartbeat/engine";
import { env } from "./env";
import { assertIMessageDatabaseReady, isIMessageAuthorizationError } from "./imessage/database-access";
import { normalizePhone } from "./utils/phone";
import { logger } from "./utils/logger";
import { WATCHER_CONFIG, THREAD } from "./agent/config";

let sdk: IMessageSDK | undefined;
let heartbeat: HeartbeatEngine | undefined;
let shuttingDown = false;

const shutdown = (exitCode = 0): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutting down...");
  heartbeat?.stop();
  sdk?.stopWatching();
  process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

async function main(): Promise<void> {
  sdk = new IMessageSDK({
    watcher: WATCHER_CONFIG,
  });

  await assertIMessageDatabaseReady(sdk);

  const client = sdk;
  injectSendFn(async (to, text) => {
    await client.send(to, text);
  });
  injectAddReminder(async (reminder) => {
    await heartbeatStateStore.addReminder(reminder);
  });

  await heartbeatStateStore.init();
  heartbeat = new HeartbeatEngine(client, generalAgent, env.OWNER_PHONE);

  await client.startWatching({
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
        await client.send(msg.sender, reply);
        logger.info(`-> ${sender}: ${reply}`);
      } catch (err) {
        logger.error("Agent error:", err);
        await client.send(msg.sender, "エラーが発生しました。もう一度お試しください。");
      }
    },

    onError: (err) => {
      logger.error("Watcher error:", err);

      if (isIMessageAuthorizationError(err)) {
        logger.error(
          "Stopping agent because macOS denied access to the iMessage database. Grant Full Disk Access to the host app that launches this command, then restart.",
        );
        shutdown(1);
      }
    },
  });

  heartbeat.start(env.HEARTBEAT_INTERVAL_MS);

  logger.info("Agent started. Waiting for messages...");
  logger.info(`  Owner phone: ${env.OWNER_PHONE}`);
  logger.info(`  Heartbeat interval: ${String(env.HEARTBEAT_INTERVAL_MS / 1000)}s`);
}

await main().catch((error) => {
  logger.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
});
