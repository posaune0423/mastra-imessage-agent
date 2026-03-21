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

Configure environment variables (see `src/env.ts` and project docs). Then:

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
```

### Git hooks

`bun install` runs `prepare` → `vp config`, pointing Git hooks at `.vite-hooks/_` (gitignored). Typical local setup: **pre-commit** `vp staged`, **pre-push** `bun run ci:prepush`. Regenerate hooks with `bunx vp config`; disable with e.g. `VITE_GIT_HOOKS=0 bun install`.

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **quality** (`bun run check`) and **tests** (`bun run test`) on pull requests and pushes to `main`.

---

<div align="center">

<sub>Educational / personal project. Respect privacy and Apple’s terms when automating Messages.</sub>

</div>
