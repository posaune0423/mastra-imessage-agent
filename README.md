# mastra-imessage-agent

[Mastra](https://mastra.ai) と iMessage をつなぐエージェント用のプロジェクトです。ボット本体・ワークフロー・ツールなどをここに集約して開発します。

## リポジトリ

- GitHub: [posaune0423/mastra-imessage-agent](https://github.com/posaune0423/mastra-imessage-agent)

ローカルではフォルダ名 `mastra-imessage-agent` で clone して作業する想定です。

```bash
git clone https://github.com/posaune0423/mastra-imessage-agent.git
cd mastra-imessage-agent
```

## 要件

- [Bun](https://bun.com)（ランタイム・パッケージ管理）
- TypeScript（peer 依存）

## セットアップ

依存関係は **Bun** で入れます（`package.json` の `packageManager` は `bun@1.3.10`）。Vite+ の CLI である `vp install` は現状 Bun をサポートしていないため、このリポジトリでは `bun install` / `bun add` / `bun remove` を使ってください。

```bash
bun install
```

[Vite+ の `vp`](https://viteplus.dev/guide/) はグローバルに入れておくと、`vp check` など開発用コマンドが使えます（依存の解決は上記のとおり Bun）。

### フォーマット・Lint・型チェック

Lint は **Oxlint のみ**（ESLint は使いません）。ルールは [`.oxlintrc.json`](./.oxlintrc.json)（`ignorePatterns` / `plugins` / `env` / `options` / `categories` / `rules` / `overrides`）。[`vite.config.ts`](./vite.config.ts) には **Oxfmt・Vitest・`staged`（`vp staged`）** を置きます。`vp` が Vite 設定を Oxlint 設定として読み込むため、`lint` を `vite.config` に書くと `fmt` など未知フィールドで失敗するため、Oxlint 本体は `.oxlintrc.json` に分離しています。

```bash
vp fmt              # Oxfmt で整形
vp fmt --check      # 整形差分のみ検査
vp lint             # Oxlint
vp lint --fix       # Oxlint の自動修正
vp check            # fmt + oxlint + tsc（推奨）
vp check --fix      # 直せるものをまとめて適用

bun run lint        # vp lint
bun run lint:fix    # vp lint --fix
bun run check       # vp check
```

### Git hooks（Vite+）

[Vite+ の commit hooks](https://viteplus.dev/guide/commit-hooks) を使います。`bun install` の `prepare` で `vp config` が走り、`core.hooksPath` を `.vite-hooks/_`（生成物、未コミット）に向けます。プロジェクト固有のスクリプトは [`.vite-hooks/pre-commit`](./.vite-hooks/pre-commit) / [`.vite-hooks/pre-push`](./.vite-hooks/pre-push) です。

- **pre-commit**: [`vp staged`](./vite.config.ts)（`vite.config.ts` の `staged` に従い、ステージ済みへ `vp lint --fix` → `vp fmt`、ほか JSON/MD/YAML は `vp fmt` のみ）
- **pre-push**: [`ci:prepush`](./package.json)（`vp check` + `bun run test`）

手動でフックだけ入れ直す場合: `bunx vp config`。無効化: `VITE_GIT_HOOKS=0 bun install` など。

### CI（GitHub Actions）

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) で PR / `main` 向けに次のジョブを並列実行します。

1. `quality / VP — fmt, oxlint, TypeScript`（`bun run check` → `vp check`。Oxfmt が Node で `vite.config.ts` を読むため、CI では **Node 22** と `NODE_OPTIONS=--experimental-strip-types` を設定）
2. `test / Vitest (vite-plus)`（`bun run test`）

## 実行

```bash
bun run start
# または開発時ホットリロード
bun run dev
```
