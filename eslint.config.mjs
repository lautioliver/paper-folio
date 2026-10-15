import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reportes generados por vitest --coverage.
    "coverage/**",
    // Worktrees de los subagentes: ESLint (flat config) no lee .gitignore.
    ".claude/**",
  ]),
]);

export default eslintConfig;
