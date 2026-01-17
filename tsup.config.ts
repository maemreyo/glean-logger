import { defineConfig } from 'tsup';
import { copy } from 'fs-extra';
import path from 'path';

async function copyTemplates() {
  await copy(path.resolve('templates'), path.resolve('dist/templates'));
}

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
    async onSuccess() {
      await copyTemplates();
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
  // React build (React integration)
  {
    entry: ['src/react.tsx'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    treeshake: true,
    external: ['react', 'react-dom'],
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    name: 'glean-logger-react',
    banner: {
      js: `/*! Glean Logger v${process.env['npm_package_version'] || '1.0.0'} (React) | MIT License */`,
    },
  },
  // Next.js plugin (CommonJS for next.config.js)
  {
    entry: ['src/next-plugin.ts'],
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    treeshake: false,
    external: ['next'],
    platform: 'node',
    target: 'es2022',
    outDir: 'dist',
    name: 'glean-logger-next-plugin',
    banner: {
      js: `/*! Glean Logger v${process.env['npm_package_version'] || '1.0.0'} (Next.js Plugin) | MIT License */`,
    },
  },
]);
