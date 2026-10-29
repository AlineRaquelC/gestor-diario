import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { expect, it, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';

it.each(['empty', 'upgrade'])('recorrência: %s em SQLite temporário preserva dados e foreign keys', mode => {
  const directory = mkdtempSync(join(tmpdir(), 'recurrence-migration-'));
  const connection = openDatabase(join(directory, 'isolated.db'));
  try {
    const tables = ['projects', 'tasks', 'subtasks', 'notes', 'task_history', 'task_reminders'];
    let before: unknown[] = [];
    if (mode === 'upgrade') {
      const old = join(directory, 'old'); mkdirSync(join(old, 'meta'), { recursive: true });
      const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'));
      journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 4);
      writeFileSync(join(old, 'meta/_journal.json'), JSON.stringify(journal));
      for (const entry of journal.entries) {copyFileSync(join(migrationsFolder, `${entry.tag}.sql`), join(old, `${entry.tag}.sql`));}
      migrate(connection.db, { migrationsFolder: old });
      connection.sqlite.exec(`
        INSERT INTO projects(id, client_id, name, color, icon) VALUES ('p', 'pc', 'Projeto', '#fff', 'P');
        INSERT INTO tasks(id, client_id, title, project_id, start_date, due_date, priority, deleted_at, reminder_time_zone, time)
          VALUES ('t', 'tc', 'Legada', 'p', '2026-10-29', '2026-10-30', 'HIGH', '2026-10-29T00:00:00Z', 'America/Sao_Paulo', '10:00');
        INSERT INTO subtasks(id, task_id, title, done) VALUES ('s', 't', 'Filha', 1);
        INSERT INTO notes(id, task_id, content) VALUES ('n', 't', 'Nota');
        INSERT INTO task_history(id, task_id, action, metadata) VALUES ('h', 't', 'CREATED', '{}');
        INSERT INTO task_reminders(id, task_id, offset_minutes) VALUES ('r', 't', 15);
      `);
      before = tables.map(table => connection.sqlite.prepare(`SELECT * FROM ${table}`).all());
    }
    migrate(connection.db, { migrationsFolder }); migrate(connection.db, { migrationsFolder });
    expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
    expect(connection.sqlite.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
    expect(connection.sqlite.prepare('SELECT * FROM recurrence_series').all()).toEqual([]);
    if (mode === 'upgrade') {
      const after = tables.map(table => connection.sqlite.prepare(`SELECT * FROM ${table}`).all().map(row => {
        const fields = { ...(row as Record<string, unknown>) };
        if (table === 'tasks') {
          expect(fields.recurrence_series_id).toBeNull(); expect(fields.occurrence_key).toBeNull();
          delete fields.recurrence_series_id; delete fields.occurrence_key;
        }
        return fields;
      }));
      expect(after).toEqual(before);
    }
  } finally {connection.sqlite.close(); rmSync(directory, { recursive: true, force: true });}
});

let connection: ReturnType<typeof openDatabase>;
beforeEach(() => {
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.sqlite.exec(`
    INSERT INTO projects(id, name, color, icon) VALUES ('p', 'Projeto', '#fff', 'P');
    INSERT INTO recurrence_series(id, client_id, frequency, time_zone, anchor_date, first_occurrence_key, title, project_id, priority, start_offset_days, subtasks, reminders)
      VALUES ('series', 'client', 'DAILY', 'UTC', '2026-10-29', '2026-10-29', 'Rotina', 'p', 'LOW', 0, '[]', '[]');
  `);
});
afterEach(() => connection.sqlite.close());
function insert(id: string, series: string | null, slot: string | null) {
  return connection.sqlite.prepare('INSERT INTO tasks(id, title, project_id, start_date, due_date, priority, recurrence_series_id, occurrence_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, 'T', 'p', '2026-10-29', '2026-10-29', 'LOW', series, slot);
}
it('Task comum aceita null; recorrente exige pareamento em insert/update e FK', () => {
  expect(() => insert('normal', null, null)).not.toThrow();
  expect(() => insert('half1', 'series', null)).toThrow(/CHECK/);
  expect(() => insert('half2', null, '2026-10-29')).toThrow(/CHECK/);
  expect(() => insert('orphan', 'missing', '2026-10-29')).toThrow(/FOREIGN KEY/);
  expect(() => connection.sqlite.prepare("UPDATE tasks SET recurrence_series_id = 'series' WHERE id = 'normal'").run()).toThrow(/CHECK/);
});
it('UNIQUE ocupa slot mesmo após soft delete; restore preserva a mesma Task', () => {
  insert('one', 'series', '2026-10-29');
  connection.sqlite.prepare("UPDATE tasks SET deleted_at = '2026-10-29T00:00:00Z' WHERE id = 'one'").run();
  expect(() => insert('duplicate', 'series', '2026-10-29')).toThrow(/UNIQUE/);
  connection.sqlite.prepare("UPDATE tasks SET deleted_at = NULL WHERE id = 'one'").run();
  expect(connection.sqlite.prepare('SELECT id FROM tasks').all()).toEqual([{ id: 'one' }]);
  expect(() => connection.sqlite.prepare("DELETE FROM recurrence_series WHERE id = 'series'").run()).toThrow(/FOREIGN KEY/);
});
it.each([['frequency', 'YEARLY'], ['start_offset_days', -1], ['start_offset_days', 0.5], ['subtasks', '{}'], ['reminders', '{}'], ['title', ' ']])('constraint da série rejeita %s=%s', (column, value) => {
  expect(() => connection.sqlite.prepare(`UPDATE recurrence_series SET ${column} = ?`).run(value)).toThrow(/CHECK/);
});
it('FK de projeto e clientId único preservam identidade da série', () => {
  expect(() => connection.sqlite.prepare("UPDATE recurrence_series SET project_id = 'missing'").run()).toThrow(/FOREIGN KEY/);
  expect(() => connection.sqlite.prepare("INSERT INTO recurrence_series SELECT 'other', client_id, frequency, time_zone, anchor_date, first_occurrence_key, materialized_through, title, description, project_id, priority, time, start_offset_days, subtasks, reminders, created_at, updated_at FROM recurrence_series").run()).toThrow(/UNIQUE/);
});
