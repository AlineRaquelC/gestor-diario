/* eslint-env node */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

export function normalizeMessage(message) {
  // Literal union order is not meaningful to TypeScript's diagnostic identity.
  return message.replace(/"(?:[^"\\]|\\.)*"(?:\s*\|\s*"(?:[^"\\]|\\.)*")+/g,
    union => union.match(/"(?:[^"\\]|\\.)*"/g).sort().join(' | '))
    .replace(/\s+/g, ' ').trim();
}

export function parseTypeScript(output) {
  const diagnostics = [];
  let current;
  for (const line of output.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) {continue;}
    const fileError = /^(.+?)\(\d+,\d+\): (?:error|warning) TS(\d+): (.*)$/.exec(line);
    const globalError = /^(?:error|warning) TS(\d+): (.*)$/.exec(line);
    if (fileError || globalError) {
      current = fileError
        ? { file: fileError[1].replaceAll('\\', '/'), code: `TS${fileError[2]}`, message: fileError[3] }
        : { file: '<compiler>', code: `TS${globalError[1]}`, message: globalError[2] };
      diagnostics.push(current);
    } else if (current && /^\s/.test(line)) {
      current.message += ` ${line.trim()}`;
    } else {
      throw new Error(`Saída TypeScript não reconhecida: ${line}`);
    }
  }
  return diagnostics.map(item => ({ ...item, message: normalizeMessage(item.message) }));
}

export function parseESLint(results, root) {
  if (!Array.isArray(results) || !results.length) {throw new Error('ESLint não analisou arquivos.');}
  return results.flatMap(result => {
    if (result.fatalErrorCount) {throw new Error(`Erro fatal de ESLint em ${result.filePath}.`);}
    return result.messages.map(item => ({
      file: relative(root, result.filePath).replaceAll('\\', '/'),
      rule: item.ruleId, severity: item.severity, message: normalizeMessage(item.message),
    }));
  });
}

function identity(entry) {
  const diagnostic = { ...entry };
  delete diagnostic.count;
  return JSON.stringify(Object.entries(diagnostic).sort(([left], [right]) => left.localeCompare(right)));
}

export function groupDiagnostics(diagnostics) {
  const grouped = new Map();
  for (const diagnostic of diagnostics) {
    const key = identity(diagnostic);
    const entry = grouped.get(key) ?? { ...diagnostic, count: 0 };
    entry.count++;
    grouped.set(key, entry);
  }
  return [...grouped.values()].sort((left, right) => identity(left).localeCompare(identity(right)));
}

export function compareDiagnostics(diagnostics, baseline) {
  const known = new Map(baseline.map(item => [identity(item), item.count]));
  const current = groupDiagnostics(diagnostics);
  return current.flatMap(item => item.count > (known.get(identity(item)) ?? 0)
    ? [{ ...item, count: item.count - (known.get(identity(item)) ?? 0) }] : []);
}

export function readBaseline(path) {
  const baseline = JSON.parse(readFileSync(path, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.diagnostics)) {throw new Error('Baseline inválida.');}
  const keys = new Set();
  for (const item of baseline.diagnostics) {
    const key = identity(item);
    if (!item.file || /[*?]/.test(item.file) || !item.message ||
        !Number.isInteger(item.count) || item.count < 1 || keys.has(key)) {
      throw new Error('Baseline contém identidade inválida, repetida ou wildcard.');
    }
    keys.add(key);
  }
  return baseline.diagnostics;
}

export function validateToolResult(result, diagnostics) {
  if (result.error || result.signal || ![0, 1, 2].includes(result.status) || result.stderr?.trim()) {
    throw new Error(`Falha ao executar a ferramenta: ${result.error?.message ?? result.stderr ?? result.signal ?? result.status}`);
  }
  if ((result.status !== 0 && !diagnostics.length) ||
      (result.status === 0 && diagnostics.some(item => item.code || item.severity === 2))) {
    throw new Error('Código de saída incompatível com os diagnósticos; verificação interrompida.');
  }
}

export function report(label, diagnostics, baseline) {
  const regressions = compareDiagnostics(diagnostics, baseline);
  if (regressions.length) {
    console.error(`${label}: novos diagnósticos ou ocorrências adicionais:`);
    for (const item of regressions) {console.error(JSON.stringify(item));}
    process.exitCode = 1;
  } else {
    const knownCount = baseline.reduce((sum, item) => sum + item.count, 0);
    console.log(`${label}: ${diagnostics.length} diagnósticos conhecidos / baseline ${knownCount}; nenhuma regressão.`);
  }
}
