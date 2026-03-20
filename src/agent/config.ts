export const AGENT_CONFIG = {
  id: "general-agent",
  name: "General Agent",
  model: "anthropic/claude-sonnet-4-6",
} as const;

export const MEMORY_CONFIG = {
  lastMessages: 20,
  workingMemoryTemplate: `# User Profile
- Name: (unknown)
- Preferences: (none)
- Timezone: (unknown)
- Notes: (none)`,
} as const;

export const WATCHER_CONFIG = {
  pollInterval: 2000,
  excludeOwnMessages: true,
} as const;

export const THREAD = {
  default: "default",
  heartbeat: "heartbeat",
} as const;
