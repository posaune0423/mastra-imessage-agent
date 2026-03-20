import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { env } from "../env";
import { MEMORY_CONFIG } from "./config";

export const storage = new LibSQLStore({
  id: "agent-storage",
  url: env.DATABASE_URL,
});

export const memory = new Memory({
  storage,
  options: {
    lastMessages: MEMORY_CONFIG.lastMessages,
    workingMemory: {
      enabled: true,
      template: MEMORY_CONFIG.workingMemoryTemplate,
    },
  },
});
