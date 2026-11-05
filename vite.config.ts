import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'socket.io-client': path.resolve(__dirname, './node_modules/socket.io-client/dist/socket.io.esm.min.js')
    }
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
});
