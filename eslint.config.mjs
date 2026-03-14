import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default defineConfig([
  {
		languageOptions: {
			globals: {
				...globals.browser,
        ...globals.node,
			},
	
		},
	},
  
  ...obsidianmd.configs.recommended,
  // 1. Global Ignores: This tells ESLint to completely skip these files
  globalIgnores([
    "build/",
    "docs",
    ".git/",
		"node_modules",
    "mediapipe_models",
		"dist",
		"apps/",
    "pythonScripts/",
    "slide-studio-app/",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
    "vitest.config.ts",
    "notes",
	]),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
  },
]);

