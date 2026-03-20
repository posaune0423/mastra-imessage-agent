import { readFileSync } from "node:fs";
import type { Agent } from "@mastra/core/agent";
import { heartbeatStateStore } from "./state";
import { env } from "../../env";
import { logger } from "../../utils/logger";
import { THREAD } from "../config";

interface IMessageSender {
  send: (to: string, content: string) => Promise<unknown>;
}

export class HeartbeatEngine {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sdk: IMessageSender,
    private readonly agent: Agent,
    private readonly ownerPhone: string,
  ) {}

  start(intervalMs: number = env.HEARTBEAT_INTERVAL_MS): void {
    if (this.timer) this.stop();

    logger.info(
      `Heartbeat starting: interval=${String(intervalMs)}ms active=${env.HEARTBEAT_ACTIVE_START}-${env.HEARTBEAT_ACTIVE_END}`,
    );

    this.tick().catch((err: unknown) => {
      logger.error("Heartbeat tick error:", err);
    });
    this.timer = setInterval(() => {
      this.tick().catch((err: unknown) => {
        logger.error("Heartbeat tick error:", err);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Heartbeat stopped");
    }
  }

  private isActiveHours(): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = env.HEARTBEAT_ACTIVE_START.split(":").map(Number);
    const [endH, endM] = env.HEARTBEAT_ACTIVE_END.split(":").map(Number);

    const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  private buildPrompt(checklist: string, stateJson: string): string {
    return `[HEARTBEAT CHECK]
${checklist}

Current state:
${stateJson}

Current time: ${new Date().toISOString()}

Instructions:
- Review the checklist items above
- Check if any reminders in the state are due or approaching
- If nothing requires the user's attention: reply EXACTLY with "HEARTBEAT_OK" and nothing else
- If something needs attention: write a short, actionable message (under 200 chars) to send the user
- Never send trivial or low-priority alerts`;
  }

  private async tick(): Promise<void> {
    if (!this.isActiveHours()) {
      logger.debug("Outside active hours, skipping heartbeat");
      return;
    }

    logger.debug("Running heartbeat tick...");

    let checklist = "";
    try {
      checklist = readFileSync(new URL("../HEARTBEAT.md", import.meta.url), "utf-8");
    } catch {
      checklist = "";
    }

    const state = await heartbeatStateStore.load();
    const stateJson = JSON.stringify(state, null, 2);

    let result: Awaited<ReturnType<typeof this.agent.generate>>;
    try {
      result = await this.agent.generate(this.buildPrompt(checklist, stateJson), {
        memory: {
          resource: this.ownerPhone,
          thread: THREAD.heartbeat,
        },
      });
    } catch (err) {
      logger.error("Heartbeat agent error:", err);
      return;
    }

    const responseText = result.text.trim();
    logger.debug(`Heartbeat response: ${responseText.slice(0, 80)}...`);

    if (responseText.startsWith("HEARTBEAT_OK")) {
      logger.debug("Heartbeat: silent (HEARTBEAT_OK)");
    } else {
      logger.info("Heartbeat: sending alert to owner");
      try {
        await this.sdk.send(this.ownerPhone, responseText);
      } catch (err) {
        logger.error("Failed to send heartbeat alert:", err);
      }
    }

    state.lastRunAt = new Date().toISOString();
    await heartbeatStateStore.save(state);
  }
}
