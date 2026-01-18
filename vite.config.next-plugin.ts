import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { EXTERNALS, getVersionBanner } from './vite.config.shared';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/next-plugin.ts'),
      name: 'GleanLoggerNextPlugin',
      formats: ['cjs'],
      fileName: () => 'next-plugin.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      external: ['next', ...EXTERNALS],
      output: {
        banner: getVersionBanner().replace(
          ' | MIT License */',
          ' (Next.js Plugin) | MIT License */'
        ),
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
