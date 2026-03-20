import { mkdirSync } from "node:fs";

/** Vitest runs on UTC runners; heartbeat active hours use local wall clock. */
process.env.TZ = "Asia/Tokyo";

/** LibSQL file URLs use `./data/*.db`; directory is gitignored and not in the repo. */
mkdirSync("data", { recursive: true });
