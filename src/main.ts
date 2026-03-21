import { IMessageSDK } from "@photon-ai/imessage-kit";

import { generalAgent } from "./agents/general-agent";
import { HeartbeatEngine } from "./agents/heartbeat";
import { env } from "./env";
import { logger } from "./utils/logger";
import { normalizePhone, samePhone } from "./utils/phone";

export async function main() {
  const sdk = new IMessageSDK({
    watcher: { excludeOwnMessages: true },
  });

  const heartbeat = new HeartbeatEngine({
    agent: generalAgent,
    ownerPhone: env.OWNER_PHONE,
    sendMessage: (to, text) => sdk.send(to, text),
  });

  const shutdown = async () => {
    logger.info("Shutting down...");
    heartbeat.stop();
    sdk.stopWatching();
    await sdk.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await sdk.startWatching({
    onDirectMessage: async (message) => {
      const sender = message.sender?.trim() || message.chatId?.trim();
      const text = message.text?.trim();
      if (!sender || !text || !samePhone(sender, env.OWNER_PHONE)) return;

      logger.info(`[imessage] <- sender=${sender} text=${JSON.stringify(text)}`);
      try {
        const result = await generalAgent.generate(text, {
          memory: { resource: normalizePhone(sender), thread: "default" },
        });
        const reply = result.text.trim();
        if (reply) {
          logger.info(`[imessage] -> to=${sender} text=${JSON.stringify(reply)}`);
          await sdk.send(sender, reply);
        }
      } catch (error) {
        logger.error("[imessage] failed to handle direct message", error);
      }
    },
    onError: (error) => logger.error("[imessage] watcher error", error),
  });

  heartbeat.start();
  logger.info("Agent started. Waiting for messages...");
}

if (import.meta.main) {
  await main();
}
