import type { ToolsetsInput } from "@mastra/core/agent";

import type { HeartbeatConfig } from "../config";
import { loadTextFile } from "../utils/fs";
import { logger } from "../utils/logger";

interface AgentLike {
  generate: (
    message: string,
    options: {
      memory: {
        resource: string;
        thread: string;
      };
      maxSteps?: number;
      toolsets?: ToolsetsInput;
    },
  ) => Promise<{
    text: string;
  }>;
}

function toMinuteValue(value: string): number {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isHeartbeatActive(now: Date, start: string, end: string): boolean {
  const current = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinuteValue(start);
  const endMinutes = toMinuteValue(end);

  if (startMinutes <= endMinutes) {
    return current >= startMinutes && current <= endMinutes;
  }

  return current >= startMinutes || current <= endMinutes;
}

export class HeartbeatEngine {
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly deps: {
      agent: AgentLike;
      ownerPhone: string;
      sendMessage: (to: string, text: string) => Promise<unknown>;
      heartbeat: HeartbeatConfig;
      resolveToolsets?: () => Promise<ToolsetsInput>;
      maxSteps?: number;
    },
  ) {}

  start() {
    if (this.#timer) {
      return;
    }

    this.#timer = setInterval(() => {
      void this.tick();
    }, this.deps.heartbeat.intervalMs);
  }

  stop() {
    if (!this.#timer) {
      return;
    }

    clearInterval(this.#timer);
    this.#timer = null;
  }

  async tick(now = new Date()): Promise<"skipped" | "silent" | "sent"> {
    if (!isHeartbeatActive(now, this.deps.heartbeat.activeStart, this.deps.heartbeat.activeEnd)) {
      logger.debug("[heartbeat] skipped outside active hours");
      return "skipped";
    }

    const toolsets = await this.deps.resolveToolsets?.();
    const result = await this.deps.agent.generate(loadTextFile(new URL("./HEARTBEAT.md", import.meta.url)), {
      memory: {
        resource: this.deps.ownerPhone,
        thread: "autonomy",
      },
      maxSteps: this.deps.maxSteps,
      toolsets,
    });
    const reply = result.text.trim();

    if (!reply || reply === "HEARTBEAT_OK") {
      logger.debug("[heartbeat] silent");
      return "silent";
    }

    logger.info(`-> heartbeat send to=${this.deps.ownerPhone} text=${JSON.stringify(reply)}`);
    await this.deps.sendMessage(this.deps.ownerPhone, reply);
    return "sent";
  }
}
