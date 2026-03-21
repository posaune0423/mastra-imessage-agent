import { IMessageSDK } from "@photon-ai/imessage-kit";
import type { ToolsetsInput } from "@mastra/core/agent";

import { createGeneralAgent } from "./agents/general-agent";
import { HeartbeatEngine } from "./agents/heartbeat";
import { createMcpClient, resolveMcpToolsets } from "./agents/mcp";
import { createAgentToolRuntime, createAgentTools } from "./agents/tools";
import { env } from "./env";
import { logger } from "./utils/logger";
import { samePhone } from "./utils/phone";

interface DirectMessage {
  sender?: string | null;
  chatId?: string | null;
  text?: string | null;
}

interface DirectMessageHandlerDeps {
  ownerPhone: string;
  agent: ReturnType<typeof createGeneralAgent>;
  sendMessage: (to: string, text: string) => Promise<unknown>;
  resolveToolsets?: () => Promise<ToolsetsInput>;
  maxSteps?: number;
}

export function createDirectMessageHandler(deps: DirectMessageHandlerDeps) {
  return async (message: DirectMessage) => {
    const sender = message.sender?.trim() || message.chatId?.trim();
    const text = message.text?.trim();
    if (!sender || !text || !samePhone(sender, deps.ownerPhone)) return;

    logger.info(`[imessage] <- sender=${sender} text=${JSON.stringify(text)}`);

    const toolsets = await deps.resolveToolsets?.();
    const result = await deps.agent.generate(text, {
      memory: { resource: sender, thread: "default" },
      maxSteps: deps.maxSteps,
      toolsets,
    });
    const reply = result.text.trim();
    if (reply) {
      logger.info(`[imessage] -> to=${sender} text=${JSON.stringify(reply)}`);
      await deps.sendMessage(sender, reply);
    }
  };
}

export async function main() {
  const sdk = new IMessageSDK({
    watcher: { excludeOwnMessages: true },
  });

  const toolRuntime = createAgentToolRuntime(sdk);
  const builtInTools = createAgentTools(toolRuntime);
  const agent = createGeneralAgent(builtInTools);
  const mcpClient = createMcpClient();
  const getToolsets = async () => resolveMcpToolsets(mcpClient);

  const heartbeat = new HeartbeatEngine({
    agent,
    ownerPhone: env.OWNER_PHONE,
    sendMessage: async (to, text) => sdk.send(to, text),
    resolveToolsets: getToolsets,
    maxSteps: env.AUTONOMY_MAX_STEPS,
  });

  const onDirectMessage = createDirectMessageHandler({
    ownerPhone: env.OWNER_PHONE,
    agent,
    sendMessage: async (to, text) => sdk.send(to, text),
    resolveToolsets: getToolsets,
    maxSteps: env.AUTONOMY_MAX_STEPS,
  });

  const shutdown = async () => {
    logger.info("Shutting down...");
    toolRuntime.destroy();
    heartbeat.stop();
    sdk.stopWatching();
    await mcpClient?.disconnect();
    await sdk.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await sdk.startWatching({
    onDirectMessage: async (message) => {
      try {
        await onDirectMessage(message);
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
