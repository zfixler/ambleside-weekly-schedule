import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Makes built asset URLs relative so dist/index.html works when opened directly.
  base: './',

  plugins: [viteSingleFile()],

  build: {
    // Ensure everything can be inlined into the HTML.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
  },
});
