import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            // Redirect obsidian to a mock if needed, but vi.mock should normally work.
            // If it fails to resolve, we can alias it to an empty file.
            'obsidian': './src/tests/mocks/obsidian.ts'
        }
    }
});
