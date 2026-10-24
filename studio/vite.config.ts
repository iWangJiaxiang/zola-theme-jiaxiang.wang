import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  build: { outDir: 'dist/client', emptyOutDir: true },
  server: { host: '127.0.0.1' },
});
