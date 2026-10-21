/* eslint-env node */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { compareDiagnostics, groupDiagnostics, normalizeMessage, parseESLint, parseTypeScript, readBaseline, validateToolResult } from './baseline.mjs';

const require = createRequire(import.meta.url);
const known = Array.from({ length: 11 }, (_, index) => ({ file: `src/file-${index}.tsx`, code: 'TS2322', message: 'Type number is not assignable to string.' }));
const baseline = groupDiagnostics(known);
const extra = { ...known[0], message: 'New incompatible type.' };
function reporter(diagnostics) {
  const code = `import {report} from ${JSON.stringify(new URL('./baseline.mjs', import.meta.url).href)};
    report('fixture', ${JSON.stringify(diagnostics)}, ${JSON.stringify(baseline)});`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
}

test('11 diagnósticos conhecidos passam e 8 conhecidos também passam', () => {
  assert.equal(reporter(known).status, 0);
  assert.equal(reporter(known.slice(0, 8)).status, 0);
  assert.equal(reporter([]).status, 0);
});
test('11 conhecidos + 1 novo retornam exit 1', () => {
  assert.equal(reporter([...known, extra]).status, 1);
});
test('mesma quantidade com diagnóstico substituído continua falhando', () => {
  assert.equal(reporter([extra, ...known.slice(1)]).status, 1);
});
for (const change of [{ file: 'src/new.tsx' }, { code: 'TS9999' }, { message: 'Outra mensagem.' }]) {
  test(`identidade TypeScript detecta alteração de ${Object.keys(change)[0]}`, () => {
    assert.equal(compareDiagnostics([{ ...known[0], ...change }], baseline).length, 1);
  });
}
test('ocorrências adicionais da mesma identidade não são escondidas', () => {
  assert.equal(compareDiagnostics([known[0], known[0]], baseline)[0].count, 1);
});
test('ESLint bloqueia erros, warnings novos e aumentos, aceitando reduções', () => {
  const warning = { file: 'src/A.tsx', rule: 'react-native/no-inline-styles', severity: 1, message: 'Inline style: { width: 38 }' };
  const error = { file: 'backend/tests/A.ts', rule: '@typescript-eslint/no-unused-vars', severity: 2, message: "'old' is assigned a value but never used." };
  const lintBaseline = groupDiagnostics([warning, error]);
  assert.deepEqual(compareDiagnostics([warning], lintBaseline), []);
  for (const diagnostics of [[warning, warning], [{ ...warning, file: 'src/B.tsx' }], [{ ...warning, severity: 2 }], [{ ...error, message: 'New error' }]]) {
    assert.ok(compareDiagnostics(diagnostics, lintBaseline).length > 0);
  }
});
test('parser TypeScript ignora posições e preserva mensagem completa, arquivo e código', () => {
  const left = 'src/A.tsx(1,2): error TS2769: No overload matches.\n  Overload 1 failed.\n    Property is missing.\n';
  const right = left.replace('(1,2)', '(900,34)').replaceAll('\n', '\r\n');
  assert.deepEqual(parseTypeScript(left), parseTypeScript(right));
  assert.equal(parseTypeScript(left)[0].message, 'No overload matches. Overload 1 failed. Property is missing.');
  assert.deepEqual(parseTypeScript('error TS5058: Missing configuration.'), [{ file: '<compiler>', code: 'TS5058', message: 'Missing configuration.' }]);
});
test('normalização ordena apenas uniões de literais e preserva membros/mensagens', () => {
  assert.equal(normalizeMessage('Type "slide" | "fade" | "none" failed.'), normalizeMessage('Type "none" | "slide" | "fade" failed.'));
  assert.notEqual(normalizeMessage('Type "slide" | "fade" failed.'), normalizeMessage('Type "slide" | "none" failed.'));
});
test('saída desconhecida, falha de execução e status incoerente são bloqueantes', () => {
  assert.throws(() => parseTypeScript('Unexpected startup failure'));
  for (const result of [{ status: null, error: new Error('missing tool') }, { status: 1, stderr: '' }, { status: 137, stderr: '' }, { status: 0, stderr: 'Warning about configuration' }, { status: 0, signal: 'SIGTERM' }]) {
    assert.throws(() => validateToolResult(result, []));
  }
  assert.throws(() => validateToolResult({ status: 0, stderr: '' }, [known[0]]));
});
test('ESLint vazio ou erro fatal não viram baseline', () => {
  assert.throws(() => parseESLint([], '/repo'));
  assert.throws(() => parseESLint([{ filePath: '/repo/a.js', fatalErrorCount: 1 }], '/repo'));
});
test('baseline inválida, wildcard ou identidade repetida são rejeitados', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ci-baseline-'));
  const path = join(directory, 'baseline.json');
  try {
    for (const diagnostics of [[{ ...baseline[0], file: 'src/*' }], [{ ...baseline[0], count: 0 }], [baseline[0], baseline[0]]]) {
      writeFileSync(path, JSON.stringify({ version: 1, diagnostics }));
      assert.throws(() => readBaseline(path));
    }
  } finally {rmSync(directory, { recursive: true, force: true });}
});
test('TypeScript real identifica regressão em fixture temporária fora do produto', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ci-typescript-'));
  const path = join(directory, 'fixture.ts');
  try {
    writeFileSync(path, 'const regression: string = 42;\n');
    const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--pretty', 'false', '--strict', '--skipLibCheck', path], { cwd: directory, encoding: 'utf8' });
    const diagnostics = parseTypeScript(result.stdout);
    validateToolResult(result, diagnostics);
    assert.ok(diagnostics.some(item => item.code === 'TS2322'));
    assert.equal(reporter(diagnostics).status, 1);
  } finally {rmSync(directory, { recursive: true, force: true });}
});
test('ESLint real identifica regressão por stdin sem tocar código de produto', () => {
  const result = spawnSync(process.execPath, [join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'), '--config', '.github/ci/eslint.ci.cjs', '--stdin', '--stdin-filename', 'scripts/ci/probe.mjs', '--format', 'json'], {
    encoding: 'utf8', input: '/* eslint-env node */\nconst regression = 42;\n',
  });
  const diagnostics = parseESLint(JSON.parse(result.stdout), process.cwd());
  validateToolResult(result, diagnostics);
  assert.ok(diagnostics.some(item => item.rule === 'no-unused-vars'));
  assert.equal(compareDiagnostics(diagnostics, []).length > 0, true);
});
test('Jest exclui somente App.test.tsx exato e backend, mantendo futuros testes mobile', () => {
  const config = require('../../.github/ci/jest.config.cjs');
  const ignores = config.testPathIgnorePatterns.map(pattern => new RegExp(pattern.replace('<rootDir>', '/repo')));
  const ignored = path => ignores.some(pattern => pattern.test(path));
  assert.equal(ignored('/repo/__tests__/App.test.tsx'), true);
  assert.equal(ignored('/repo/backend/tests/tasks.test.ts'), true);
  assert.equal(ignored('/repo/__tests__/AppFeature.test.tsx'), false);
  assert.equal(ignored('/repo/future/new.test.tsx'), false);
});
