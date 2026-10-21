import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the build portable for GitHub Pages project sites
  // (https://<user>.github.io/<repo>/) and root-hosted static sites alike.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
});
