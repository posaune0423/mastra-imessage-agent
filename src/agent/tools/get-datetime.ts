import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getDateTimeTool = createTool({
  id: "get-datetime",
  description:
    "Returns the current date, time, and day of week. Use this when the user asks about the current time or date.",
  inputSchema: z.object({
    timezone: z.string().optional().describe("IANA timezone name e.g. Asia/Tokyo"),
  }),
  outputSchema: z.object({
    iso: z.string(),
    readable: z.string(),
    dayOfWeek: z.string(),
    timezone: z.string(),
  }),
  execute: async ({ timezone }) => {
    await Promise.resolve();
    const tz = timezone ?? "Asia/Tokyo";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

    return {
      iso: now.toISOString(),
      readable: `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`,
      dayOfWeek: get("weekday"),
      timezone: tz,
    };
  },
});
