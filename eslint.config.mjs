import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from 'typescript-eslint';
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
    ".git/",
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
  },
]);

