import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@tsdraw/react/tsdraw.css',
        replacement: fileURLToPath(new URL('../../packages/tsdraw-react/dist/tsdraw.css', import.meta.url)),
      },
      {
        find: /^@tsdraw\/react$/,
        replacement: fileURLToPath(new URL('../../packages/tsdraw-react/dist/index.js', import.meta.url)),
      },
      {
        find: /^@tsdraw\/core$/,
        replacement: fileURLToPath(new URL('../../packages/tsdraw-core/dist/index.js', import.meta.url)),
      },
    ],
  },
  server: { port: 5173 },
});
