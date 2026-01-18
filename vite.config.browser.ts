import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { EXTERNALS, getVersionBanner } from './vite.config.shared';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/browser-entry.ts'),
      name: 'GleanLoggerBrowser',
      formats: ['es'],
      fileName: () => 'browser-entry.mjs',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      external: EXTERNALS,
      output: {
        banner: getVersionBanner().replace(' | MIT License */', ' (Browser) | MIT License */'),
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
      tsconfigPath: './tsconfig.json',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'node_modules'],
    }),
  ],
});
