import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@orpc/client', '@orpc/tanstack-query', '@tanstack/react-query', 'react'],
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  minify: false,
});