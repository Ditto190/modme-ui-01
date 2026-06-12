import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  server: {
    port: 3000,
    fs: {
      allow: [resolve(__dirname)]
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
