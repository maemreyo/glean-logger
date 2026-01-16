import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  external: ['winston', 'winston-daily-rotate-file'],
  platform: 'node',
  target: 'es2022',
  outDir: 'dist',
});
