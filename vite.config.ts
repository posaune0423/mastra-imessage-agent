import { defineConfig } from "vite-plus";

const ignorePatterns = ["**/node_modules/**", "dist/**", "out/**", "coverage/**", ".vite/**"];

export default defineConfig({
  fmt: {
    ignorePatterns,
    // Oxfmt（Prettier 互換）— 既存の TS / JSON と揃える
    printWidth: 120,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    sortPackageJson: true,
  },
  // Oxlint — type-aware flags in `lint.options`; plugins / env in `.oxlintrc.json`.
  lint: {
    ignorePatterns,
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**"],
    testTimeout: 30_000,
  },
});
