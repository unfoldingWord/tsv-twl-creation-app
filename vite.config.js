import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, './src/common'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['fsevents'],
    include: ['twl-generator', 'tsv-quote-converters']
  },
  build: {
    commonjsOptions: {
      include: [/twl-generator/, /tsv-quote-converters/, /node_modules/]
    }
  }
});
