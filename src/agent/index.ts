import { Agent } from "@mastra/core/agent";
import { readFileSync } from "node:fs";
import { getDateTimeTool, sendMessageTool, setReminderTool, webSearchTool } from "./tools";
import { memory } from "./memory";
import { AGENT_CONFIG } from "./config";

function loadSoul(): string {
  try {
    return readFileSync(new URL("./SOUL.md", import.meta.url), "utf-8");
  } catch {
    return `You are a helpful personal assistant accessible via iMessage.
Be concise and friendly. Respond in the same language the user writes in.
Keep replies short (under 300 characters) when possible.`;
  }
}

export const generalAgent = new Agent({
  ...AGENT_CONFIG,
  instructions: loadSoul(),
  tools: {
    getDateTimeTool,
    sendMessageTool,
    setReminderTool,
    webSearchTool,
  },
  memory,
});
