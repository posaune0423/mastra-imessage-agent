import { defineConfig } from "vite-plus";
import type { OxlintConfig } from "oxlint";

const fmtIgnorePatterns = ["**/node_modules/**", "dist/**", "out/**", "coverage/**", ".vite/**"];

/** Lint-only ignores (docs / tooling trees / caches). */
const lintIgnorePatterns = [
  ...fmtIgnorePatterns,
  ".vinext/**",
  ".cache/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".cursor/**",
  "docs/**",
  "public/**",
];

/**
 * Oxlint flat-style config (Vite+ passes this through to Oxlint).
 * Rule IDs: https://oxc.rs/docs/guide/usage/linter/rules.html
 * UI に TSX を増やす場合は `plugins` に `"react"` を足し、`env: { browser: true }` などを調整する。
 */
const oxlint: OxlintConfig = {
  ignorePatterns: lintIgnorePatterns,
  plugins: ["typescript", "import", "unicorn", "node", "vitest"],
  env: {
    builtin: true,
  },
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    // ── ESLint (core) ─────────────────────────────────────────
    "no-unused-vars": "off",
    "no-redeclare": "error",

    // ── TypeScript ─────────────────────────────────────────────
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-definitions": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-import-type-side-effects": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/no-deprecated": "warn",

    // type-aware
    "typescript/await-thenable": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-for-in-array": "error",
    "typescript/no-implied-eval": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/promise-function-async": "error",
    "typescript/restrict-plus-operands": "error",
    "typescript/restrict-template-expressions": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/unbound-method": "error",

    // ── Import ─────────────────────────────────────────────────
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    "import/first": "error",
    "import/no-duplicates": "error",
    "import/no-mutable-exports": "error",
    "import/no-named-default": "error",

    // ── Unicorn ────────────────────────────────────────────────
    "unicorn/consistent-empty-array-spread": "error",
    "unicorn/error-message": "error",
    "unicorn/escape-case": "error",
    "unicorn/new-for-builtins": "error",
    "unicorn/no-instanceof-builtins": "error",
    "unicorn/no-new-array": "error",
    "unicorn/no-new-buffer": "error",
    "unicorn/number-literal-case": "error",
    "unicorn/prefer-dom-node-text-content": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/prefer-number-properties": "error",
    "unicorn/prefer-string-starts-ends-with": "error",
    "unicorn/prefer-type-error": "error",
    "unicorn/throw-new-error": "error",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      rules: {
        "typescript/no-explicit-any": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/consistent-type-imports": "off",
      },
    },
    {
      files: ["src/main.ts"],
      rules: {
        "unicorn/no-process-exit": "off",
      },
    },
  ],
};

export default defineConfig({
  fmt: {
    ignorePatterns: fmtIgnorePatterns,
    printWidth: 120,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    sortPackageJson: true,
  },
  lint: oxlint,
  test: {
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**"],
    testTimeout: 30_000,
  },
});
