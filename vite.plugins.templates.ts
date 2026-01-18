import { copy, remove, pathExists } from 'fs-extra';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

export function copyTemplatesPlugin(): Plugin {
  return {
    name: 'copy-templates',
    closeBundle: async () => {
      const currentDir =
        typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
      const templatesSrc = resolve(currentDir, 'templates');
      const templatesDest = resolve(currentDir, 'dist/templates');

      if (await pathExists(templatesSrc)) {
        await remove(templatesDest);
        await copy(templatesSrc, templatesDest);
        console.log('[copy-templates] Templates copied to dist/templates');
      }
    },
  };
}
