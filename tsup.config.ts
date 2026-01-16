import { defineConfig } from 'tsup';

export default defineConfig([
  // Server build (Node.js)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    treeshake: true,
    external: ['winston', 'winston-daily-rotate-file'],
    platform: 'node',
    target: 'es2022',
    outDir: 'dist',
    name: 'glean-logger',
    banner: {
      js: `/*! Glean Logger v${process.env['npm_package_version'] || '1.0.0'} | MIT License */`,
    },
  },
  // Browser build (no Node.js built-ins)
  {
    entry: ['src/browser-entry.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    treeshake: true,
    external: [],
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    name: 'glean-logger-browser',
    banner: {
      js: `/*! Glean Logger v${process.env['npm_package_version'] || '1.0.0'} (Browser) | MIT License */`,
    },
  },
]);
