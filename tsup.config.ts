import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: false,
});
