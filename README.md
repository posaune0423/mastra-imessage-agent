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

Lint は **Oxlint のみ**（ESLint は使いません）。設定は次の2つに分かれます。

- [`vite.config.ts`](./vite.config.ts) の `lint.options`（例: `typeAware` / `typeCheck`）
- [`.oxlintrc.json`](./.oxlintrc.json) の `plugins` / `env`（import / typescript / unicorn / node / vitest など、Oxlint で表現できる範囲のルール）

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

### Git hooks（Husky）

- **pre-commit**: `lint-staged`（ステージ済みに `vp lint --fix` → `vp fmt`）
- **pre-push**: `ci:prepush`（`vp check` + `bun run test`）

初回 clone 後は `bun install` で `prepare` により Husky が有効になります。

### CI（GitHub Actions）

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) で PR / `main` 向けに次のジョブを並列実行します。

1. `quality / VP — fmt, oxlint, TypeScript`（`vp check`）
2. `test / Vitest (vite-plus)`（`bun run test`）

## 実行

```bash
bun run start
# または開発時ホットリロード
bun run dev
```
