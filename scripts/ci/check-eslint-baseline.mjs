/* eslint-env node */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseESLint, readBaseline, report, validateToolResult } from './baseline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
try {
  const result = spawnSync(process.execPath, [join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'),
    '.', '--config', '.github/ci/eslint.ci.cjs', '--ext', '.js,.jsx,.ts,.tsx,.mjs,.cjs', '--ignore-pattern', '!.github/', '--format', 'json'],
  { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.error) {throw result.error;}
  const diagnostics = parseESLint(JSON.parse(result.stdout ?? ''), root);
  validateToolResult(result, diagnostics);
  console.log(`ESLint executado: ${diagnostics.filter(item => item.severity === 2).length} erro(s), ${diagnostics.filter(item => item.severity === 1).length} warning(s).`);
  report('ESLint global', diagnostics, readBaseline(new URL('../../.github/ci/eslint-baseline.json', import.meta.url)));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
