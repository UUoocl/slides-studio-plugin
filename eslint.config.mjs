import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // 1. Global Ignores
  globalIgnores([
    "build/",
    "docs/",
    ".git/",
    "node_modules/",
    "mediapipe_models/",
    "dist/",
    "apps/",
    "pythonScripts/",
    "slide-studio-app/",
    "esbuild.config.mjs",
    "eslint.config.mjs",
    "version-bump.mjs",
    "versions.json",
    "main.js",
    "vitest.config.ts",
    "coverage/",
  ]),

  // 2. Base Configuration for all files
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // 3. Recommended configs
  ...tseslint.configs.recommended,
  ...obsidianmd.configs.recommended,

  // 4. TypeScript specific settings
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
]);
