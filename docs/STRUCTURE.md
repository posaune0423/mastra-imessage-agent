# STRUCTURE

## 1. 目的

このファイルは「どこに何を置くか」を固定するためのもの。  
実装よりも先に配置ルールを明確にして、構成の揺れを防ぐ。

## 2. 採用する構成

```text
.
├── docs/
│   ├── DESIGN.md
│   ├── PRD.md
│   ├── STRUCTURE.md
│   └── TECH.md
├── scripts/
│   └── send-message.ts
├── src/
│   ├── agents/
│   │   ├── HEARTBEAT.md
│   │   ├── SOUL.md
│   │   ├── general-agent.ts
│   │   ├── heartbeat.ts
│   │   ├── memory.ts
│   │   ├── mcp/
│   │   │   ├── client.ts
│   │   │   ├── index.ts
│   │   │   ├── servers.ts
│   │   │   └── toolsets.ts
│   │   └── tools/
│   │       ├── imessage.ts
│   │       ├── index.ts
│   │       ├── runtime.ts
│   │       ├── scheduling.ts
│   │       └── web.ts
│   ├── utils/
│   │   ├── fs.ts
│   │   ├── logger.ts
│   │   └── phone.ts
│   ├── env.ts
│   └── main.ts
├── data/                           # gitignore
└── tests/
    ├── e2e/
    ├── integration/
    ├── setup.ts
    └── unit/
```

## 3. 配置ルール

### 3.1 `docs/`

人間向けの設計文書を置く。

- PRD
- DESIGN
- STRUCTURE
- TECH

### 3.2 `src/agents/`

agent 関連の実装と、agent が runtime に読む markdown asset を置く。

- `SOUL.md` — agent システムプロンプト
- `HEARTBEAT.md` — heartbeat チェックリスト
- agent definition
- memory
- heartbeat
- `tools/` — Mastra tool definitions と runtime wrappers
- `mcp/` — MCP server 定義、client、toolset 解決

### 3.3 `src/utils/`

薄い再利用 helper だけを置く。

- `fs.ts` — ファイル読み込み
- `phone.ts` — 電話番号正規化
- `logger.ts` — ログ出力

複雑な domain logic は入れない。

### 3.4 `tests/`

Vitest の test hierarchy を固定する。

- `tests/unit`
- `tests/integration`
- `tests/e2e`

## 4. 採用しない配置

以下には戻さない。

- `src/lib/imessage`
- `src/workflows`
- `src/mastra`
- top-level `agents/` ディレクトリ（md は `src/agents/` に同居）

## 5. 命名ルール

- env schema は `src/env.ts`
- phone helper は `src/utils/phone.ts`
- file loader は `src/utils/fs.ts`
- entrypoint は `src/main.ts`
- agent prompt markdown は `src/agents/*.md`
- tool 実装は `src/agents/tools/*.ts`
- MCP 実装は `src/agents/mcp/*.ts`
