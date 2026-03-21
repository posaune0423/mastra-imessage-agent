import { Agent } from "@mastra/core/agent";
import type { ToolsInput } from "@mastra/core/agent";

import { env } from "../env";
import { loadTextFile } from "../utils/fs";
import { createAgentMemory } from "./memory";

export function createGeneralAgent(tools: ToolsInput = {}) {
  return new Agent({
    id: "general-agent",
    name: "General Agent",
    instructions: loadTextFile(new URL("./SOUL.md", import.meta.url)),
    model: env.ANTHROPIC_MODEL,
    tools,
    memory: createAgentMemory(),
  });
}
