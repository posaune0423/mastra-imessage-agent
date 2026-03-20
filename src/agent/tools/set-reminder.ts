import { createTool } from "@mastra/core/tools";
import { z } from "zod";

let _addReminder: ((reminder: { text: string; dueAt: string }) => Promise<void>) | null = null;

export function injectAddReminder(
  fn: (reminder: { text: string; dueAt: string }) => Promise<void>,
) {
  _addReminder = fn;
}

export const setReminderTool = createTool({
  id: "set-reminder",
  description:
    "Saves a reminder that the agent will check during heartbeat. The agent will notify the user when the due time approaches.",
  inputSchema: z.object({
    text: z.string().describe("What to remind the user about"),
    dueAt: z.string().describe("ISO 8601 datetime when to remind"),
  }),
  outputSchema: z.object({ saved: z.boolean() }),
  execute: async ({ text, dueAt }) => {
    if (!_addReminder) throw new Error("addReminder not injected");
    await _addReminder({ text, dueAt });
    return { saved: true };
  },
});
