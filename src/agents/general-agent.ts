import { Agent } from "@mastra/core/agent";

import { env } from "../env";
import { loadTextFile } from "../utils/fs";
import { createAgentMemory } from "./memory";

export const generalAgent = new Agent({
  id: "general-agent",
  name: "General Agent",
  instructions: loadTextFile(new URL("./SOUL.md", import.meta.url)),
  model: env.ANTHROPIC_MODEL,
  memory: createAgentMemory(),
});
