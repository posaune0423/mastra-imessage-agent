import { MCPClient } from "@mastra/mcp";

import { env } from "../../env";
import { createMcpServerDefinitions } from "./servers";

export function createMcpClient(): MCPClient | null {
  const servers = createMcpServerDefinitions();
  if (Object.keys(servers).length === 0) {
    return null;
  }

  return new MCPClient({
    servers,
    timeout: env.MCP_TIMEOUT_MS,
  });
}
