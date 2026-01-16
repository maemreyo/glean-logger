import { defineConfig } from 'tsup';

export default defineConfig({
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
  banner: {
    js: `/*! Glean Logger v${process.env['npm_package_version'] || '1.0.0'} | MIT License */`,
  },
});
