import type { ToolsetsInput } from "@mastra/core/agent";
import type { MCPClient } from "@mastra/mcp";

import { logger } from "../../utils/logger";

export async function resolveMcpToolsets(client: MCPClient | null): Promise<ToolsetsInput> {
  if (!client) {
    return {};
  }

  const { toolsets, errors } = await client.listToolsetsWithErrors();
  for (const [serverName, error] of Object.entries(errors)) {
    logger.warn(`[mcp] failed to connect to ${serverName}`, error);
  }

  return toolsets;
}
