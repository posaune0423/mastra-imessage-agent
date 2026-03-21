import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { env } from "../env";

export function createAgentMemory(): Memory {
  return new Memory({
    storage: new LibSQLStore({
      id: "agent-storage",
      url: env.DATABASE_URL,
    }),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: `# Owner Profile
- Name:
- Preferences:
- Ongoing Tasks:
- Reminders:
`,
      },
    },
  });
}
