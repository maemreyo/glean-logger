import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { EXTERNALS, getVersionBanner } from './vite.config.shared';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/react.tsx'),
      name: 'GleanLoggerReact',
      formats: ['es', 'cjs'],
      fileName: format => `react.${format === 'es' ? 'mjs' : 'js'}`,
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      external: [
        ...EXTERNALS,
        // Also externalize React internal packages that may be bundled
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: {
        banner: getVersionBanner().replace(' | MIT License */', ' (React) | MIT License */'),
        // Properly map React imports to global variables for CJS
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        // Ensure externalized packages are not bundled
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    // Don't use @vitejs/plugin-react for library builds
    // as it bundles React into the output. We want React
    // to be provided by the host application.
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
      tsconfigPath: './tsconfig.json',
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'node_modules'],
    }),
  ],
});
