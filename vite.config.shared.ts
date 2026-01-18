/**
 * Shared Vite configuration constants
 * Used by all Vite config files for consistent externals
 */

export const EXTERNALS = [
  'winston',
  'winston-daily-rotate-file',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'next',
];

export const SERVER_EXTERNALS = [
  'winston',
  'winston-daily-rotate-file',
  'fs',
  'path',
  'os',
  'fs-extra',
];

export function getVersionBanner(): string {
  return `/*! Glean Logger v${process.env.npm_package_version || '1.0.0'} | MIT License */`;
}
