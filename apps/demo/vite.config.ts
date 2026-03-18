import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'tsdraw/tsdraw.css',
        replacement: fileURLToPath(new URL('../../packages/tsdraw-react/src/styles/tsdraw.css', import.meta.url)),
      },
      {
        find: /^tsdraw$/,
        replacement: fileURLToPath(new URL('../../packages/tsdraw-react/src/index.ts', import.meta.url)),
      },
      {
        find: /^@tsdraw\/core$/,
        replacement: fileURLToPath(new URL('../../packages/tsdraw-core/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: { port: 5173 },
});
