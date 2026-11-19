import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Everything (JS, CSS, SVG) is inlined into a single dist/index.html.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
