import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// The whole app is inlined into one HTML file so it can be opened directly from
// disk (file://), a USB drive, or GitHub Pages under any path. "base: './'" keeps
// any stray asset reference relative.
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
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
