import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

export const env = createEnv({
  server: {
    ANTHROPIC_API_KEY: z.string().min(1),
    ANTHROPIC_MODEL: z.string().default("anthropic/claude-sonnet-4-6"),
    OWNER_PHONE: z.string().min(1),

    HEARTBEAT_INTERVAL_MS: z.coerce.number().default(60 * 60 * 1000),
    HEARTBEAT_ACTIVE_START: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default("08:00"),
    HEARTBEAT_ACTIVE_END: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default("22:00"),

    DATABASE_URL: z.string().default("file:./data/agent.db"),
    IMESSAGE_SCHEDULER_PERSIST_PATH: z.string().default("./data/imessage-scheduler.json"),
    WEB_SEARCH_ENABLED: booleanFromEnv,
    WEB_FETCH_ENABLED: booleanFromEnv,
    WEB_SEARCH_PROVIDER: z.enum(["brave"]).default("brave"),
    BRAVE_API_KEY: z.string().optional(),
    MCP_SERVERS_JSON: z.string().optional(),
    MCP_TIMEOUT_MS: z.coerce.number().default(60_000),
    AUTONOMY_MAX_STEPS: z.coerce.number().int().positive().default(5),
    AUTONOMY_OBSERVATIONAL_MEMORY: booleanFromEnv,
    AUTONOMY_OBSERVATIONAL_MODEL: z.string().optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "log", "info", "debug", "trace"]).default("info"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
