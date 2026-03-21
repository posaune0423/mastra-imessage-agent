import type { MastraMCPServerDefinition } from "@mastra/mcp";

import { env } from "../../env";
import { logger } from "../../utils/logger";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createMcpServerDefinitions(): Record<string, MastraMCPServerDefinition> {
  if (!env.MCP_SERVERS_JSON) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(env.MCP_SERVERS_JSON);
    if (!isRecord(parsed)) {
      return {};
    }

    const servers: Record<string, MastraMCPServerDefinition> = {};
    for (const [name, value] of Object.entries(parsed)) {
      if (!isRecord(value)) continue;

      if (typeof value.command === "string") {
        servers[name] = {
          command: value.command,
          args: Array.isArray(value.args) ? value.args.filter((item): item is string => typeof item === "string") : [],
          env: isRecord(value.env)
            ? Object.fromEntries(
                Object.entries(value.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
              )
            : undefined,
        };
        continue;
      }

      if (typeof value.url === "string") {
        servers[name] = {
          url: new URL(value.url),
          requestInit: isRecord(value.headers)
            ? {
                headers: Object.fromEntries(
                  Object.entries(value.headers).filter(
                    (entry): entry is [string, string] => typeof entry[1] === "string",
                  ),
                ),
              }
            : undefined,
        };
      }
    }

    return servers;
  } catch (error) {
    logger.warn("[mcp] failed to parse MCP_SERVERS_JSON", error);
    return {};
  }
}
