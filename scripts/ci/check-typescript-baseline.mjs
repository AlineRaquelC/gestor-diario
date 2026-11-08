/* eslint-env node */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseTypeScript, readBaseline, report, validateToolResult } from './baseline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
try {
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--noEmit', '--pretty', 'false', '--project', '.github/ci/tsconfig.mobile.json'],
  { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.error) {throw result.error;}
  const diagnostics = parseTypeScript(result.stdout ?? '');
  validateToolResult(result, diagnostics);
  report('TypeScript mobile', diagnostics, readBaseline(new URL('../../.github/ci/typescript-baseline.json', import.meta.url)));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
