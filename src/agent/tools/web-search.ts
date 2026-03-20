import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Searches the web for current information. Use this for questions about recent events, prices, weather, or any real-time data.",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    await Promise.resolve();
    // TODO: Replace with real search API (Firecrawl, Tavily, etc.)
    return {
      results: [
        {
          title: "Web search not configured",
          url: "",
          snippet: `Set up a search API (Firecrawl/Tavily) and implement this tool. (query: ${query})`,
        },
      ],
    };
  },
});
