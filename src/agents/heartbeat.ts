import { env } from "../env";
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
      intervalMs?: number;
      activeStart?: string;
      activeEnd?: string;
    },
  ) {}

  start() {
    if (this.#timer) {
      return;
    }

    const intervalMs = this.deps.intervalMs ?? env.HEARTBEAT_INTERVAL_MS;
    this.#timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  stop() {
    if (!this.#timer) {
      return;
    }

    clearInterval(this.#timer);
    this.#timer = null;
  }

  async tick(now = new Date()): Promise<"skipped" | "silent" | "sent"> {
    const activeStart = this.deps.activeStart ?? env.HEARTBEAT_ACTIVE_START;
    const activeEnd = this.deps.activeEnd ?? env.HEARTBEAT_ACTIVE_END;

    if (!isHeartbeatActive(now, activeStart, activeEnd)) {
      logger.debug("[heartbeat] skipped outside active hours");
      return "skipped";
    }

    const result = await this.deps.agent.generate(loadTextFile(new URL("./HEARTBEAT.md", import.meta.url)), {
      memory: {
        resource: this.deps.ownerPhone,
        thread: "heartbeat",
      },
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
