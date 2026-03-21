import type { ToolsInput } from "@mastra/core/agent";
import type { AgentToolRuntime } from "./runtime";

import { createIMessageTools } from "./imessage";
import { createSchedulingTools } from "./scheduling";
import { createAgentToolRuntime } from "./runtime";
import { createWebTools } from "./web";

export function createAgentTools(runtime: AgentToolRuntime): ToolsInput {
  return {
    ...createWebTools(),
    ...createIMessageTools(runtime),
    ...createSchedulingTools(runtime),
  };
}

export { createAgentToolRuntime };
export type { AgentToolRuntime };
