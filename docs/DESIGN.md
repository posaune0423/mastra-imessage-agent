# Technical Design — iMessage × Mastra General Agent Template

**Version**: 1.0  
**Date**: 2026-03-21  
**前提**: 実装ゼロからスタート。このドキュメントを読めば迷いなくコードを書ける状態にする。

---

## 0. 読み方

このドキュメントの構成：

1. **全体アーキテクチャ** — 何がどう繋がるか
2. **フォルダ構成** — どこに何を置くか
3. **各モジュールの実装詳細** — 何をどう書くか
4. **セットアップ手順** — 最初に何をするか
5. **実装チェックリスト** — どの順番で実装するか

---

## 1. 全体アーキテクチャ

### 1.1 システム概要

```mermaid
graph TB
    subgraph macOS["macOS Host"]
        iMsg["iMessage.app"]
        ChatDB["~/Library/Messages/chat.db\n(SQLite, read-only)"]
    end

    subgraph Process["Bun Process"]
        direction TB

        SDK["IMessageSDK\n@photon-ai/imessage-kit\n\nonDirectMessage(msg)\nsend(to, text)"]

        subgraph Core["Agent Core"]
            AGENT["generalAgent\n@mastra/core Agent\n\nmodel: claude-sonnet-4-6\ntools: {...}\nmemory: Memory"]
        end

        subgraph HeartbeatEngine["Heartbeat Engine"]
            HB_TIMER["setInterval\n(HEARTBEAT_INTERVAL_MS)"]
            HB_LOGIC["tick()\n\n1. isActiveHours?\n2. read HEARTBEAT.md\n3. agent.generate\n4. HEARTBEAT_OK? → silent\n   else → sdk.send"]
            HB_STATE["HeartbeatState\n(LibSQL)\n\nmetadata, reminders\nlast_run_at"]
        end

        subgraph MemoryLayer["Memory (per user)"]
            MEMORY["@mastra/memory\n\nlastMessages: 20\nworkingMemory: enabled"]
        end

        subgraph StorageLayer["Storage"]
            DB["LibSQLStore\n./data/agent.db\n\nthreads, messages\nworking_memory"]
        end

        subgraph WorkflowLayer["Workflows"]
            WF["dailyReportWorkflow\ncron: '0 9 * * *'"]
        end
    end

    subgraph External["External"]
        CLAUDE["Anthropic Claude API"]
    end

    iMsg <-->|"AppleScript + SQLite poll"| SDK
    ChatDB -->|"poll 2s"| SDK
    SDK -->|"onDirectMessage"| AGENT
    AGENT -->|"reply text"| SDK
    HB_TIMER --> HB_LOGIC
    HB_LOGIC --> AGENT
    HB_LOGIC --> HB_STATE
    HB_LOGIC -->|"alert text"| SDK
    AGENT <--> MEMORY
    MEMORY --> DB
    HB_STATE --> DB
    WF --> AGENT
    WF -->|"report text"| SDK
    AGENT <-->|"API call"| CLAUDE
```

### 1.2 データフロー：DM 受信 → 返信

```mermaid
sequenceDiagram
    participant User as User (iPhone)
    participant iMsg as iMessage.app
    participant SDK as IMessageSDK
    participant Main as index.ts
    participant Agent as generalAgent
    participant Mem as Memory
    participant DB as agent.db
    participant LLM as Claude API

    User->>iMsg: "明日の天気は？"
    iMsg->>SDK: onDirectMessage(msg)
    Note over SDK,Main: msg.isFromMe = false<br/>msg.sender = "+819012345678"

    SDK->>Main: handler(msg)
    Main->>Main: filter(OWNER_PHONE)

    Main->>Agent: agent.generate(msg.text, {<br/>  memory: {<br/>    resource: "+819012345678",<br/>    thread: "default"<br/>  }<br/>})

    Agent->>Mem: loadHistory(resource, thread)
    Mem->>DB: SELECT messages WHERE thread="default"
    DB-->>Mem: [past messages...]
    Mem-->>Agent: context messages

    Agent->>LLM: POST /v1/messages
    LLM-->>Agent: "明日の東京は晴れで25℃です"

    Agent->>Mem: saveMessages(newMessages)
    Mem->>DB: INSERT messages
    Agent-->>Main: result.text

    Main->>SDK: sdk.send(msg.sender, result.text)
    SDK->>iMsg: AppleScript send
    iMsg->>User: "明日の東京は晴れで25℃です"
```

### 1.3 データフロー：Heartbeat

```mermaid
sequenceDiagram
    participant Timer as setInterval
    participant HB as HeartbeatEngine
    participant FS as HEARTBEAT.md
    participant DB as agent.db
    participant Agent as generalAgent
    participant LLM as Claude API
    participant SDK as IMessageSDK
    participant User as User (iPhone)

    Timer->>HB: tick() [every 60min]

    HB->>HB: isActiveHours()?
    alt 08:00-22:00 の範囲外
        HB-->>Timer: skip
    end

    HB->>FS: readFile("./HEARTBEAT.md")
    FS-->>HB: checklist content

    HB->>DB: loadHeartbeatState()
    DB-->>HB: {reminders: [...], metadata: {...}}

    HB->>Agent: agent.generate(prompt, {<br/>  memory: { resource: OWNER_PHONE,<br/>  thread: "heartbeat" }<br/>})
    Agent->>LLM: POST /v1/messages
    LLM-->>Agent: response text

    alt response.startsWith("HEARTBEAT_OK")
        Agent-->>HB: "HEARTBEAT_OK"
        HB->>HB: silent (no send)
    else actionable response
        Agent-->>HB: "リマインダー: 14時のミーティングまで30分です"
        HB->>SDK: sdk.send(OWNER_PHONE, alertText)
        SDK->>User: [iMessage notification]
    end

    HB->>DB: saveHeartbeatState({last_run_at: now})
```

---

## 2. フォルダ構成

```
imessage-mastra-agent/
│
├── src/
│   │
│   ├── index.ts                    # ★ エントリーポイント
│   │                               #   SDK起動・ハンドラ登録・Heartbeat起動
│   │
│   ├── mastra/
│   │   └── index.ts                # Mastra インスタンス生成
│   │                               # new Mastra({ agents, workflows, storage })
│   │
│   ├── agent/
│   │   ├── index.ts                # generalAgent 定義
│   │   │                           # new Agent({ model, instructions, tools, memory })
│   │   ├── memory.ts               # Memory + LibSQLStore 初期化
│   │   └── tools/
│   │       ├── index.ts            # ツール一覧 re-export
│   │       ├── get-datetime.ts     # 現在日時を返すツール
│   │       ├── send-message.ts     # agent → iMessage 送信ツール
│   │       ├── set-reminder.ts     # heartbeat state にリマインダー追加
│   │       └── web-search.ts       # Web 検索（スタブ）
│   │   │
│   │   ├── heartbeat/
│   │   │   ├── engine.ts           # HeartbeatEngine class
│   │   │   │                       # start/stop/tick/isActiveHours
│   │   │   └── state.ts            # HeartbeatState の SQLite 永続化
│   │   │
│   ├── workflows/
│   │   └── daily-report.ts         # 日次レポート Workflow (cron スタブ)
│   │
│   └── lib/
│       ├── env.ts                  # 環境変数バリデーション (zod)
│       └── phone.ts                # 電話番号正規化ユーティリティ
│
├── data/                           # DB ファイル置き場（gitignore）
│   └── .gitkeep
│
├── HEARTBEAT.md                    # Heartbeat チェックリスト（カスタマイズ用）
├── SOUL.md                         # Agent システムプロンプト（カスタマイズ用）
│
├── .env                            # ← gitignore
├── .env.example
├── .gitignore
├── bunfig.toml
├── tsconfig.json
└── package.json
```

### モジュール依存関係

```mermaid
graph TD
    INDEX["src/index.ts"]

    INDEX --> SDK_WRAP["IMessageSDK\n(imessage-kit)"]
    INDEX --> AGENT["src/agent/index.ts"]
    INDEX --> HB_ENGINE["src/agent/heartbeat/engine.ts"]
    INDEX --> MASTRA["src/mastra/index.ts"]

    AGENT --> TOOLS["src/agent/tools/index.ts"]
    AGENT --> MEMORY["src/agent/memory.ts"]
    MEMORY --> DB["@mastra/libsql\nLibSQLStore"]

    HB_ENGINE --> HB_STATE["src/agent/heartbeat/state.ts"]
    HB_ENGINE --> AGENT
    HB_ENGINE --> SDK_WRAP
    HB_STATE --> DB

    MASTRA --> AGENT
    MASTRA --> WF["src/workflows/daily-report.ts"]
    MASTRA --> DB

    TOOLS --> SDK_WRAP

    INDEX --> ENV["src/lib/env.ts"]
    INDEX --> PHONE["src/lib/phone.ts"]
```

---

## 3. 各モジュールの実装詳細

### 3.1 `src/lib/env.ts`

**最初に作る。他の全モジュールがこれに依存する。**

```typescript
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  OWNER_PHONE: z.string().min(1, "OWNER_PHONE is required"),

  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(60 * 60 * 1000), // 1h
  HEARTBEAT_ACTIVE_START: z.string().default("08:00"),
  HEARTBEAT_ACTIVE_END: z.string().default("22:00"),

  DATABASE_URL: z.string().default("file:./data/agent.db"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

---

### 3.2 `src/lib/phone.ts`

```typescript
/**
 * 電話番号を統一フォーマットに正規化する
 * "+1 (234) 567-890" → "+1234567890"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}
```

---

### 3.3 `src/agent/memory.ts`

**Memory と Storage の初期化。Agent 定義より先に作る。**

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { env } from "../lib/env";

export const storage = new LibSQLStore({
  id: "agent-storage",
  url: env.DATABASE_URL,
});

export const memory = new Memory({
  storage, // ← storage を Memory に渡す
  options: {
    lastMessages: 20, // 直近20件を context に含める
    workingMemory: {
      enabled: true,
      // ユーザー属性を保持するテンプレート
      template: `# User Profile
- Name: (unknown)
- Preferences: (none)
- Timezone: (unknown)
- Notes: (none)`,
    },
  },
});
```

> **注意**: `observationalMemory` は長期運用時に有効化を検討。  
> 初期実装では `lastMessages: 20` のみで十分。

---

### 3.4 `src/agent/tools/get-datetime.ts`

```typescript
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
```

---

### 3.5 `src/agent/tools/send-message.ts`

**SDK への参照を後からインジェクトする設計。循環依存を避けるため。**

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { env } from "../../lib/env";

// SDK インスタンスを後から注入できる Holder
let _sendFn: ((to: string, text: string) => Promise<void>) | null = null;

export function injectSendFn(fn: (to: string, text: string) => Promise<void>) {
  _sendFn = fn;
}

export const sendMessageTool = createTool({
  id: "send-message",
  description:
    "Proactively sends an iMessage to the owner. Use this only when the agent decides to initiate a message, not as a reply.",
  inputSchema: z.object({
    text: z.string().describe("Message text to send"),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ text }) => {
    if (!_sendFn) throw new Error("sendFn not injected");
    await _sendFn(env.OWNER_PHONE, text);
    return { success: true };
  },
});
```

---

### 3.6 `src/agent/tools/set-reminder.ts`

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Heartbeat state への書き込み関数を後から注入
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
```

---

### 3.7 `src/agent/tools/web-search.ts`

**スタブ実装。`FIRECRAWL_API_KEY` があれば本実装に差し替えられる。**

```typescript
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
    // TODO: Replace with real search API (Firecrawl, Tavily, etc.)
    console.log(`[web-search] Stub called with query: ${query}`);
    return {
      results: [
        {
          title: "Web search not configured",
          url: "",
          snippet: "Set up a search API (Firecrawl/Tavily) and implement this tool.",
        },
      ],
    };
  },
});
```

---

### 3.8 `src/agent/tools/index.ts`

```typescript
export { getDateTimeTool } from "./get-datetime";
export { sendMessageTool, injectSendFn } from "./send-message";
export { setReminderTool, injectAddReminder } from "./set-reminder";
export { webSearchTool } from "./web-search";
```

---

### 3.9 `src/agent/index.ts`

```typescript
import { Agent } from "@mastra/core/agent";
import { readFileSync } from "fs";
import { getDateTimeTool, sendMessageTool, setReminderTool, webSearchTool } from "./tools";
import { memory } from "./memory";

function loadSoul(): string {
  try {
    return readFileSync("./SOUL.md", "utf-8");
  } catch {
    return `You are a helpful personal assistant accessible via iMessage.
Be concise and friendly. Respond in the same language the user writes in.
Keep replies short (under 300 characters) when possible.`;
  }
}

export const generalAgent = new Agent({
  id: "general-agent",
  name: "General Agent",
  instructions: loadSoul(),
  model: "anthropic/claude-sonnet-4-6",
  tools: {
    getDateTimeTool,
    sendMessageTool,
    setReminderTool,
    webSearchTool,
  },
  memory,
});
```

---

### 3.10 `src/agent/heartbeat/state.ts`

**Heartbeat の状態（リマインダーなど）を DB に永続化する。**

```typescript
import { LibSQLStore } from "@mastra/libsql";
import { env } from "../lib/env";

export interface Reminder {
  id: string;
  text: string;
  dueAt: string; // ISO 8601
  createdAt: string;
}

export interface HeartbeatState {
  reminders: Reminder[];
  metadata: Record<string, unknown>;
  lastRunAt: string | null;
}

const DB_PATH = env.DATABASE_URL;

// シンプルな KV ストアとして LibSQL を使う
// テーブル: heartbeat_state (key TEXT PRIMARY KEY, value TEXT)
export class HeartbeatStateStore {
  private db: ReturnType<typeof Bun.openSync> | null = null;

  async init(): Promise<void> {
    // Bun の組み込み SQLite を使ってシンプルに実装
    const dbPath = DB_PATH.replace("file:", "");

    // LibSQLStore が既にテーブルを作るので、
    // heartbeat 専用テーブルのみ追加
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS heartbeat_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.close();
  }

  async load(): Promise<HeartbeatState> {
    const dbPath = DB_PATH.replace("file:", "");
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);

    const row = db
      .query<{ value: string }, []>("SELECT value FROM heartbeat_state WHERE key = 'state'")
      .get();

    db.close();

    if (!row) {
      return { reminders: [], metadata: {}, lastRunAt: null };
    }

    return JSON.parse(row.value) as HeartbeatState;
  }

  async save(state: HeartbeatState): Promise<void> {
    const dbPath = DB_PATH.replace("file:", "");
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);

    db.run(
      `INSERT OR REPLACE INTO heartbeat_state (key, value, updated_at)
       VALUES ('state', ?, datetime('now'))`,
      [JSON.stringify(state)],
    );

    db.close();
  }

  async addReminder(reminder: Omit<Reminder, "id" | "createdAt">): Promise<void> {
    const state = await this.load();
    state.reminders.push({
      ...reminder,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    await this.save(state);
  }

  async removeReminder(id: string): Promise<void> {
    const state = await this.load();
    state.reminders = state.reminders.filter((r) => r.id !== id);
    await this.save(state);
  }
}

export const heartbeatStateStore = new HeartbeatStateStore();
```

---

### 3.11 `src/agent/heartbeat/engine.ts`

```typescript
import { readFileSync } from "fs";
import type { IMessageSDK } from "@photon-ai/imessage-kit";
import type { Agent } from "@mastra/core/agent";
import { heartbeatStateStore } from "./state";
import { env } from "../lib/env";

export class HeartbeatEngine {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sdk: IMessageSDK,
    private readonly agent: InstanceType<typeof Agent>,
    private readonly ownerPhone: string,
  ) {}

  start(intervalMs: number = env.HEARTBEAT_INTERVAL_MS): void {
    if (this.timer) this.stop();

    console.log(
      `[heartbeat] Starting with interval ${intervalMs}ms (active: ${env.HEARTBEAT_ACTIVE_START}-${env.HEARTBEAT_ACTIVE_END})`,
    );

    // 起動直後に1回実行、その後インターバルで繰り返す
    this.tick().catch(console.error);
    this.timer = setInterval(() => {
      this.tick().catch(console.error);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[heartbeat] Stopped");
    }
  }

  private isActiveHours(): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = env.HEARTBEAT_ACTIVE_START.split(":").map(Number);
    const [endH, endM] = env.HEARTBEAT_ACTIVE_END.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

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
      console.log("[heartbeat] Outside active hours, skipping");
      return;
    }

    console.log("[heartbeat] Running tick...");

    const checklist = readFileSync("./HEARTBEAT.md", "utf-8").catch
      ? await Promise.resolve("")
      : readFileSync("./HEARTBEAT.md", "utf-8");

    const state = await heartbeatStateStore.load();
    const stateJson = JSON.stringify(state, null, 2);

    let result: Awaited<ReturnType<typeof this.agent.generate>>;
    try {
      result = await this.agent.generate(this.buildPrompt(checklist, stateJson), {
        memory: {
          resource: this.ownerPhone,
          thread: "heartbeat",
        },
      });
    } catch (err) {
      console.error("[heartbeat] Agent error:", err);
      return;
    }

    const responseText = result.text.trim();
    console.log(`[heartbeat] Response: ${responseText.slice(0, 80)}...`);

    if (responseText.startsWith("HEARTBEAT_OK")) {
      console.log("[heartbeat] Silent (HEARTBEAT_OK)");
    } else {
      console.log("[heartbeat] Sending alert to owner");
      try {
        await this.sdk.send(this.ownerPhone, responseText);
      } catch (err) {
        console.error("[heartbeat] Failed to send alert:", err);
      }
    }

    // 最終実行時刻を更新
    state.lastRunAt = new Date().toISOString();
    await heartbeatStateStore.save(state);
  }
}
```

---

### 3.12 `src/workflows/daily-report.ts`

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Cron スタブ。IMessageSDK への参照を後からインジェクト。
let _sendFn: ((to: string, text: string) => Promise<void>) | null = null;
export function injectWorkflowSendFn(fn: (to: string, text: string) => Promise<void>) {
  _sendFn = fn;
}

const generateReportStep = createStep({
  id: "generate-report",
  inputSchema: z.object({}),
  outputSchema: z.object({ report: z.string() }),
  execute: async () => {
    // TODO: Implement actual report generation using the agent
    const report = `📋 Daily Summary\n${new Date().toLocaleDateString("ja-JP")}\n\n• No items today (stub)`;
    return { report };
  },
});

const sendReportStep = createStep({
  id: "send-report",
  inputSchema: z.object({ report: z.string() }),
  outputSchema: z.object({ sent: z.boolean() }),
  execute: async ({ report }) => {
    if (!_sendFn) {
      console.warn("[daily-report] sendFn not injected, skipping send");
      return { sent: false };
    }
    const ownerPhone = process.env.OWNER_PHONE ?? "";
    await _sendFn(ownerPhone, report);
    return { sent: true };
  },
});

export const dailyReportWorkflow = createWorkflow({
  id: "daily-report",
  description: "Generates and sends a daily summary every morning",
  // cron: "0 9 * * *",  // ← Inngest を使う場合はコメントアウトを外す
  inputSchema: z.object({}),
  outputSchema: z.object({ sent: z.boolean() }),
  steps: [generateReportStep, sendReportStep],
})
  .then(generateReportStep)
  .then(sendReportStep)
  .commit();
```

---

### 3.13 `src/mastra/index.ts`

```typescript
import { Mastra } from "@mastra/core";
import { generalAgent } from "../agent";
import { storage } from "../agent/memory";
import { dailyReportWorkflow } from "../workflows/daily-report";

export const mastra = new Mastra({
  agents: { generalAgent },
  workflows: { dailyReportWorkflow },
  storage,
});
```

---

### 3.14 `src/index.ts` — エントリーポイント

**全モジュールをここで繋ぎ合わせる。**

```typescript
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { generalAgent } from "./agent";
import { injectSendFn } from "./agent/tools";
import { injectWorkflowSendFn } from "./workflows/daily-report";
import { injectAddReminder } from "./agent/tools/set-reminder";
import { heartbeatStateStore } from "./agent/heartbeat/state";
import { HeartbeatEngine } from "./agent/heartbeat/engine";
import { env } from "./lib/env";
import { normalizePhone } from "./lib/phone";

// ─── SDK 初期化 ────────────────────────────────────────────
const sdk = new IMessageSDK({
  watcher: {
    pollInterval: 2000,
    excludeOwnMessages: true,
  },
});

// ─── 依存関係の注入（循環依存を避けるため起動時に注入）──────────
const sendFn = (to: string, text: string) => sdk.send(to, text);
injectSendFn(sendFn);
injectWorkflowSendFn(sendFn);
injectAddReminder((reminder) => heartbeatStateStore.addReminder(reminder));

// ─── Heartbeat 初期化 ──────────────────────────────────────
await heartbeatStateStore.init();
const heartbeat = new HeartbeatEngine(sdk, generalAgent, env.OWNER_PHONE);

// ─── iMessage ハンドラ ─────────────────────────────────────
await sdk.startWatching({
  onDirectMessage: async (msg) => {
    // OWNER_PHONE フィルタ（設定している場合）
    if (normalizePhone(msg.sender) !== env.OWNER_PHONE) {
      console.log(`[imessage] Ignored message from ${msg.sender}`);
      return;
    }

    const text = msg.text ?? "";
    if (!text.trim()) return;

    console.log(`[imessage] ← ${msg.sender}: ${text}`);

    try {
      const result = await generalAgent.generate(text, {
        memory: {
          resource: normalizePhone(msg.sender),
          thread: "default",
        },
      });

      const reply = result.text;
      await sdk.send(msg.sender, reply);
      console.log(`[imessage] → ${msg.sender}: ${reply}`);
    } catch (err) {
      console.error("[imessage] Agent error:", err);
      await sdk.send(msg.sender, "エラーが発生しました。もう一度お試しください。");
    }
  },

  onError: (err) => {
    console.error("[imessage] Watcher error:", err);
  },
});

// ─── Heartbeat 開始 ────────────────────────────────────────
heartbeat.start(env.HEARTBEAT_INTERVAL_MS);

console.log("🤖 Agent started. Waiting for messages...");
console.log(`   Owner phone: ${env.OWNER_PHONE}`);
console.log(`   Heartbeat interval: ${env.HEARTBEAT_INTERVAL_MS / 1000}s`);

// ─── Graceful Shutdown ─────────────────────────────────────
const shutdown = async () => {
  console.log("\n[system] Shutting down...");
  heartbeat.stop();
  sdk.stopWatching();
  await sdk.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

## 4. 設定ファイル

### 4.1 `package.json`

```json
{
  "name": "imessage-mastra-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@photon-ai/imessage-kit": "^2.1.2",
    "@mastra/core": "^1.2.0",
    "@mastra/memory": "^1.2.0",
    "@mastra/libsql": "^1.2.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.8.3"
  }
}
```

### 4.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

### 4.3 `.env.example`

```bash
# ── 必須 ──────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
OWNER_PHONE=+819012345678   # あなたの電話番号（+国番号形式）

# ── オプション（デフォルト値あり）──────────────
HEARTBEAT_INTERVAL_MS=3600000   # ミリ秒 (1時間)
HEARTBEAT_ACTIVE_START=08:00    # HH:MM
HEARTBEAT_ACTIVE_END=22:00      # HH:MM
DATABASE_URL=file:./data/agent.db
```

### 4.4 `HEARTBEAT.md`（テンプレート）

```markdown
# Heartbeat Checklist

You are performing a background check on behalf of the user.

## What to check

- Are any reminders in the current state due within the next 2 hours?
- Is there anything in the metadata that needs user attention?
- Are there any overdue tasks?

## Response rules

- If NOTHING needs attention → reply with exactly: HEARTBEAT_OK
- If something needs attention → write a short message (under 200 chars) to send the user
- NEVER send low-priority or trivial information
- NEVER hallucinate tasks that aren't in the state
```

### 4.5 `SOUL.md`（テンプレート）

```markdown
# Identity

You are a personal AI assistant accessible via iMessage.
You are concise, helpful, and honest.

## Communication Style

- Respond in the same language the user writes in (Japanese or English)
- Keep replies short for iMessage — aim for under 300 characters
- Prefer plain prose over markdown formatting
- Never use headers, bold text, or bullet points in replies

## Capabilities

- Answer questions and help with tasks
- Remember conversation context across sessions
- Search the web when asked for current information
- Set reminders that you'll follow up on during heartbeat checks

## What you cannot do

- Make phone calls or send emails
- Access files on the user's computer
- Be honest about limitations when asked
```

### 4.6 `.gitignore`

```
.env
data/*.db
data/*.db-shm
data/*.db-wal
node_modules/
dist/
```

---

## 5. セットアップ手順（ゼロから動かすまで）

```bash
# 1. プロジェクト作成
mkdir imessage-mastra-agent
cd imessage-mastra-agent
bun init -y

# 2. 依存インストール
bun add @photon-ai/imessage-kit @mastra/core @mastra/memory @mastra/libsql zod
bun add -d @types/bun typescript

# 3. 設定ファイル配置
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY と OWNER_PHONE を設定

# 4. data ディレクトリ作成
mkdir data
touch data/.gitkeep

# 5. macOS パーミッション付与
# System Settings → Privacy & Security → Full Disk Access
# → "+" → Terminal または Cursor を追加

# 6. 起動
bun run dev
```

---

## 6. 実装チェックリスト

以下の順番で実装する。各ステップが完了したら確認してから次へ。

### Phase 1: 基盤セットアップ（Day 1）

- [ ] `package.json` + `tsconfig.json` 作成
- [ ] `src/lib/env.ts` 実装・バリデーション確認
- [ ] `src/lib/phone.ts` 実装
- [ ] `.env` / `.env.example` / `.gitignore` 作成
- [ ] `SOUL.md` / `HEARTBEAT.md` 作成
- [ ] `data/` ディレクトリ作成

### Phase 2: Agent + Memory（Day 1-2）

- [ ] `src/agent/memory.ts` 実装（LibSQLStore + Memory）
- [ ] `src/agent/tools/get-datetime.ts` 実装
- [ ] `src/agent/tools/web-search.ts` 実装（スタブ）
- [ ] `src/agent/tools/send-message.ts` 実装（inject パターン）
- [ ] `src/agent/tools/set-reminder.ts` 実装（inject パターン）
- [ ] `src/agent/tools/index.ts` 実装
- [ ] `src/agent/index.ts` 実装（generalAgent）
- [ ] `src/mastra/index.ts` 実装

### Phase 3: iMessage 接続（Day 2）

- [ ] `src/index.ts` の基本形（SDK 初期化 + onDirectMessage のみ）実装
- [ ] ✅ **動作確認**: iMessage を送ると返信が来る

### Phase 4: Memory 確認（Day 3）

- [ ] `src/index.ts` に memory の resource/thread を追加
- [ ] ✅ **動作確認**: 「私の名前は田中です」→ 次の会話で「田中さん」と呼ばれる

### Phase 5: Heartbeat（Day 4-5）

- [ ] `src/agent/heartbeat/state.ts` 実装（Bun SQLite）
- [ ] `src/agent/heartbeat/engine.ts` 実装
- [ ] `src/index.ts` に HeartbeatEngine を追加・injectAddReminder
- [ ] ✅ **動作確認**: `HEARTBEAT_INTERVAL_MS=60000`（1分）で heartbeat が静かに動く
- [ ] ✅ **動作確認**: `HEARTBEAT.md` にダミーのアラート条件を書くと通知が来る

### Phase 6: Cron スタブ（Day 6）

- [ ] `src/workflows/daily-report.ts` 実装
- [ ] `src/mastra/index.ts` に workflow 追加
- [ ] `src/index.ts` に injectWorkflowSendFn 追加
- [ ] ✅ **動作確認**: 手動で workflow を trigger → iMessage が届く

### Phase 7: 仕上げ（Day 7-8）

- [ ] `README.md` 作成（セットアップ手順）
- [ ] `bun run typecheck` エラーゼロ確認
- [ ] 全 DoD チェックリスト確認

---

## 7. よくある問題と対処

| 問題                       | 原因                                      | 対処                                           |
| -------------------------- | ----------------------------------------- | ---------------------------------------------- |
| iMessage が受信されない    | Full Disk Access 未付与                   | System Settings で権限を付与                   |
| `ANTHROPIC_API_KEY` エラー | `.env` の読み込み失敗                     | `bun run dev` の実行ディレクトリを確認         |
| Memory が引き継がれない    | `resource`/`thread` の不一致              | `normalizePhone` の出力を `console.log` で確認 |
| Heartbeat が動かない       | `HEARTBEAT_ACTIVE_START/END` の時刻範囲外 | 現在時刻と設定値を確認                         |
| DB エラー                  | `./data/` ディレクトリが存在しない        | `mkdir data`                                   |
| `bun:sqlite` not found     | Bun バージョンが古い                      | `bun upgrade`                                  |
