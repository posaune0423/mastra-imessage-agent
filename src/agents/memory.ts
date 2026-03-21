import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { env } from "../env";

export function createAgentMemory(): Memory {
  const observationalMemory = env.AUTONOMY_OBSERVATIONAL_MEMORY
    ? {
        model: env.AUTONOMY_OBSERVATIONAL_MODEL ?? env.ANTHROPIC_MODEL,
        scope: "resource" as const,
        observation: {
          messageTokens: 12_000,
        },
        reflection: {
          observationTokens: 24_000,
        },
      }
    : false;

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
- Timezone:
- Preferred Reminder Style:

# Current Goals
- Goal 1:
- Goal 2:

# Open Loops
- Pending follow-up:
- Waiting on:

# Commitments
- Recurring commitments:
- Promises already made:

# Messaging Context
- Default Delivery Target:
- Known Contacts / Chats:
- Tool Constraints:
`,
      },
      observationalMemory,
    },
  });
}
