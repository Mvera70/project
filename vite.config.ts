import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  // §13.4: the same `dist/` has to serve from a domain root and from GitHub
  // Pages' subdirectory without being rebuilt. Relative paths resolve against
  // the document, so neither the deploy path nor the service worker's scope is
  // written down anywhere.
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2022', sourcemap: true },
});
