import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { MessageScheduler, Reminders } from "@photon-ai/imessage-kit";
import type { IMessageSDK, Reminder, RecurringMessage, ScheduledMessage } from "@photon-ai/imessage-kit";

import { env } from "../../env";
import { logger } from "../../utils/logger";

interface PersistedSchedulingState {
  scheduled?: {
    scheduled?: ScheduledMessage[];
    recurring?: RecurringMessage[];
  };
  reminders?: Array<{
    id: string;
    to: string;
    message: string;
    scheduledFor: string;
    createdAt: string;
  }>;
}

const noop = () => {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export interface AgentToolRuntime {
  sdk: IMessageSDK;
  scheduler: MessageScheduler;
  reminders: Reminders;
  persist: () => void;
  destroy: () => void;
}

function readState(filePath: string): PersistedSchedulingState {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, "utf8").trim();
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as PersistedSchedulingState) : {};
  } catch (error) {
    logger.warn("[scheduler] failed to read persisted state", error);
    return {};
  }
}

function writeState(filePath: string, state: PersistedSchedulingState) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function serializeReminder(reminder: Reminder) {
  return {
    id: reminder.id,
    to: reminder.to,
    message: reminder.message,
    scheduledFor: reminder.scheduledFor.toISOString(),
    createdAt: reminder.createdAt.toISOString(),
  };
}

function rehydrateState(filePath: string, scheduler: MessageScheduler, reminders: Reminders) {
  const state = readState(filePath);
  if (state.scheduled) {
    scheduler.import({
      scheduled:
        state.scheduled.scheduled?.map((item) => ({
          ...item,
          sendAt: new Date(item.sendAt),
          createdAt: new Date(item.createdAt),
        })) ?? [],
      recurring:
        state.scheduled.recurring?.map((item) => ({
          ...item,
          sendAt: new Date(item.sendAt),
          nextSendAt: new Date(item.nextSendAt),
          createdAt: new Date(item.createdAt),
          endAt: item.endAt ? new Date(item.endAt) : undefined,
        })) ?? [],
    });
  }

  for (const reminder of state.reminders ?? []) {
    const scheduledFor = new Date(reminder.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      continue;
    }

    reminders.exact(scheduledFor, reminder.to, reminder.message, { id: reminder.id });
  }
}

export function createAgentToolRuntime(
  sdk: IMessageSDK,
  filePath = env.IMESSAGE_SCHEDULER_PERSIST_PATH,
): AgentToolRuntime {
  let persist = noop;

  const scheduler = new MessageScheduler(
    sdk,
    { debug: env.LOG_LEVEL === "debug" || env.LOG_LEVEL === "trace" },
    {
      onSent: () => persist(),
      onError: () => persist(),
      onComplete: () => persist(),
    },
  );

  const reminders = new Reminders(sdk, {
    onSent: () => persist(),
    onError: () => persist(),
    onComplete: () => persist(),
  });

  persist = () => {
    writeState(filePath, {
      scheduled: scheduler.export(),
      reminders: reminders.list().map(serializeReminder),
    });
  };

  rehydrateState(filePath, scheduler, reminders);

  return {
    sdk,
    scheduler,
    reminders,
    persist,
    destroy: () => {
      persist();
      reminders.destroy();
      scheduler.destroy();
    },
  };
}
