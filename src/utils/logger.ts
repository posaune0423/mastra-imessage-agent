import { createConsola } from "consola";
import { env } from "../env";

export const logger = createConsola({ level: logLevelToNumber(env.LOG_LEVEL) });

function logLevelToNumber(
  level: "fatal" | "error" | "warn" | "log" | "info" | "debug" | "trace",
): number {
  switch (level) {
    case "fatal":
    case "error":
      return 0;
    case "warn":
      return 1;
    case "log":
      return 2;
    case "info":
      return 3;
    case "debug":
      return 4;
    case "trace":
      return 5;
  }
}
