import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 17500,
    proxy: {
      '/api': {
        target: 'http://localhost:17600',
        changeOrigin: true
      }
    }
  }
});
