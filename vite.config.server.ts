import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { EXTERNALS, SERVER_EXTERNALS, getVersionBanner } from './vite.config.shared';
import { copyTemplatesPlugin } from './vite.plugins.templates';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GleanLogger',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      external: [...EXTERNALS, ...SERVER_EXTERNALS],
      output: {
        banner: getVersionBanner(),
        globals: {
          winston: 'winston',
          'winston-daily-rotate-file': 'winstonDailyRotateFile',
        },
      },
    },
  },
  plugins: [
    copyTemplatesPlugin(),
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
      tsconfigPath: './tsconfig.json',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'node_modules'],
    }),
  ],
});
