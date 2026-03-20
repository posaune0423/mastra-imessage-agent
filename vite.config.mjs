import { defineConfig } from "vite-plus";

const fmtIgnorePatterns = ["**/node_modules/**", "dist/**", "out/**", "coverage/**", ".vite/**"];

/**
 * Oxfmt + Vitest。Oxlint は `.oxlintrc.json`（`vp` / Node が `lint` 付き Vite 設定を Oxlint 設定として誤解釈するため分離）。
 */
export default defineConfig({
  fmt: {
    ignorePatterns: fmtIgnorePatterns,
    printWidth: 120,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    sortPackageJson: true,
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**"],
    testTimeout: 30_000,
  },
});
