#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function hasEslint() {
  try {
    require.resolve('eslint');
    return true;
  } catch {
    return false;
  }
}

if (!hasEslint()) {
  console.warn('ESLint is not installed in this environment. Skipping lint run.');
  process.exit(0);
}

const result = spawnSync('pnpm', ['exec', 'next', 'lint'], { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
