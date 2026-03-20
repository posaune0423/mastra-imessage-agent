import { Mastra } from "@mastra/core";
import { generalAgent } from "../agent";
import { storage } from "../agent/memory";

export const mastra = new Mastra({
  agents: { generalAgent },
  storage,
});
