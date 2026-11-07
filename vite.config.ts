import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string; repository: { url: string } };

// The whole app is inlined into one HTML file so it can be opened directly from
// disk (file://), a USB drive, or GitHub Pages under any path. "base: './'" keeps
// any stray asset reference relative.
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // The project page is the only external address in the app: a plain link the user can choose to follow.
    __REPO_URL__: JSON.stringify(pkg.repository.url),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
  },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  server: { port: 5173, strictPort: true },
});
