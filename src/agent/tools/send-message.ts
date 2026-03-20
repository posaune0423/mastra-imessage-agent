import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { env } from "../../env";

let _sendFn: ((to: string, text: string) => Promise<void>) | null = null;

export function injectSendFn(fn: (to: string, text: string) => Promise<void>) {
  _sendFn = fn;
}

export const sendMessageTool = createTool({
  id: "send-message",
  description:
    "Proactively sends an iMessage to the owner. Use this only when the agent decides to initiate a message, not as a reply.",
  inputSchema: z.object({
    text: z.string().describe("Message text to send"),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ text }) => {
    if (!_sendFn) throw new Error("sendFn not injected");
    await _sendFn(env.OWNER_PHONE, text);
    return { success: true };
  },
});
