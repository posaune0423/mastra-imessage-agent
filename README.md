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

## 実行

```bash
bun run index.ts
```
