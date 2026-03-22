import { Agent } from "@mastra/core/agent";
import type { ToolsInput } from "@mastra/core/agent";

import type { GeneralAgentConfig } from "../config";
import { loadTextFile } from "../utils/fs";
import { createAgentMemory } from "./memory";

export function createGeneralAgent(config: GeneralAgentConfig, tools: ToolsInput = {}) {
  return new Agent({
    id: "general-agent",
    name: "General Agent",
    instructions: loadTextFile(new URL("./SOUL.md", import.meta.url)),
    model: config.model,
    tools,
    memory: createAgentMemory(config.memory),
  });
}
