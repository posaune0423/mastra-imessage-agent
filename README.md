<div align="center">

# mastra-imessage-agent

**Minimal [Mastra](https://mastra.ai) agent wired to iMessage on macOS.**

[![CI](https://github.com/posaune0423/mastra-imessage-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/posaune0423/mastra-imessage-agent/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3+-000?logo=bun&logoColor=fff)](https://bun.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![iMessage Kit](https://img.shields.io/badge/iMessage%20Kit-@photon--ai-111?logo=apple&logoColor=fff)](https://github.com/photon-hq/imessage-kit)

<br />

Stack: **[imessage-kit](https://github.com/photon-hq/imessage-kit)** (`@photon-ai/imessage-kit`) · Mastra Agent · Memory · Heartbeat

<br />

[Repository](https://github.com/posaune0423/mastra-imessage-agent) · [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) · [Mastra](https://mastra.ai)

</div>

---

## Overview

Personal assistant experiment that receives **direct iMessages** from a configured owner phone, replies via **Mastra** with **threaded memory**, and runs an optional **heartbeat** prompt on a schedule. Built for a small, inspectable codebase rather than a full product surface.

## Requirements

| Requirement                | Notes                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**                  | iMessage automation targets the local Messages database / AppleScript layer.                                                                                                                                                                                                                            |
| **[Bun](https://bun.com)** | Runtime and package manager (`packageManager`: `bun@1.3.10`).                                                                                                                                                                                                                                           |
| **TypeScript**             | Peer dependency (`typescript` ^5).                                                                                                                                                                                                                                                                      |
| **Full Disk Access**       | Grant Terminal / your IDE (e.g. Cursor) in **System Settings → Privacy & Security → Full Disk Access** so [`@photon-ai/imessage-kit`](https://github.com/photon-hq/imessage-kit) can read chat data. See upstream [imessage-kit README](https://github.com/photon-hq/imessage-kit#granting-permission). |

## Quick start

```bash
git clone https://github.com/posaune0423/mastra-imessage-agent.git
cd mastra-imessage-agent
bun install
```

Copy `.env.example` to `.env` and fill in the values you need. Current public config surface:

```bash
# required
ANTHROPIC_API_KEY=...
OWNER_PHONE=+819012345678

# optional
ANTHROPIC_MODEL=anthropic/claude-sonnet-4-6
DATABASE_URL=file:./data/agent.db
IMESSAGE_SCHEDULER_PERSIST_PATH=./data/imessage-scheduler.json
HEARTBEAT_INTERVAL_MS=3600000
HEARTBEAT_ACTIVE_START=08:00
HEARTBEAT_ACTIVE_END=22:00
LOG_LEVEL=info
BRAVE_API_KEY=
ALLIUM_API_KEY=
MCP_TIMEOUT_MS=60000
```

When `BRAVE_API_KEY` is set, the app includes the `brave_search` tool in the agent instance. `web_fetch` is built in directly. When `ALLIUM_API_KEY` is set, the app enables the Allium MCP server at `https://mcp.allium.so` using the `X-API-KEY` header. Additional MCP servers should be added as dedicated files under `src/agents/mcp/` and then wired from `src/agents/mcp/index.ts`.

Then:

```bash
bun run start    # production-style run
bun run dev      # hot reload during development
```

## Development

Format, lint, and typecheck (via [Vite+](https://viteplus.dev/) / `vp` under the hood):

```bash
bun run fmt
bun run lint
bun run check
```

Run tests:

```bash
bun run test
bun run test:unit
bun run test:integration
bun run test:e2e
```

Current test coverage includes:

- unit tests for env/config wiring, scheduler persistence, phone/fs helpers, and MCP runtime wiring
- integration tests that execute every built-in Mastra tool directly without going through the iMessage watcher
- MCP tests that resolve mocked toolsets and execute an MCP-backed tool through the runtime
- e2e message-loop tests for direct-message routing and heartbeat behavior

### Git hooks

`bun install` runs `prepare` → `vp config`, pointing Git hooks at `.vite-hooks/_` (gitignored). Typical local setup: **pre-commit** `vp staged`, **pre-push** `bun run ci:prepush`. Regenerate hooks with `bunx vp config`; disable with e.g. `VITE_GIT_HOOKS=0 bun install`.

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **quality** (`bun run check`) and **tests** (`bun run test`) on pull requests and pushes to `main`.

---

<div align="center">

<sub>Educational / personal project. Respect privacy and Apple’s terms when automating Messages.</sub>

</div>
