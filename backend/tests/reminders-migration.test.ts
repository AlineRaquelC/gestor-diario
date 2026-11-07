import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { expect, it } from 'vitest';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { TasksRepository } from '../src/repositories/tasks.js';

it.each(['empty', 'upgrade'])('B08 %s usa SQLite temporário, preserva dados e reaplica migrations', mode => {
  const directory = mkdtempSync(join(tmpdir(), 'reminders-migration-'));
  const connection = openDatabase(join(directory, 'isolated.db'));
  try {
    const old = join(directory, 'old'); mkdirSync(join(old, 'meta'), { recursive: true });
    const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 3);
    writeFileSync(join(old, 'meta/_journal.json'), JSON.stringify(journal));
    for (const entry of journal.entries) copyFileSync(join(migrationsFolder, `${entry.tag}.sql`), join(old, `${entry.tag}.sql`));
    const tables = ['projects', 'tasks', 'subtasks', 'notes', 'task_history'];
    let before: unknown[] = [];
    if (mode === 'upgrade') {
      migrate(connection.db, { migrationsFolder: old });
      connection.sqlite.exec(`
        INSERT INTO projects(id, client_id, name, color, icon) VALUES ('p', 'pc', 'Projeto', '#fff', 'P');
        INSERT INTO tasks(id, client_id, title, project_id, start_date, due_date, priority, deleted_at)
          VALUES ('t', 'tc', 'Legada', 'p', '2020-01-01', '2020-01-02', 'HIGH', '2020-01-03T00:00:00Z');
        INSERT INTO subtasks(id, task_id, title, done) VALUES ('s', 't', 'Filha', 1);
        INSERT INTO notes(id, task_id, content) VALUES ('n', 't', 'Nota');
        INSERT INTO task_history(id, task_id, action, metadata) VALUES ('h', 't', 'CREATED', '{}');
      `);
      before = tables.map(table => connection.sqlite.prepare(`SELECT * FROM ${table}`).all());
    }
    migrate(connection.db, { migrationsFolder });
    migrate(connection.db, { migrationsFolder });
    expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
    expect(connection.sqlite.prepare('SELECT * FROM task_reminders').all()).toEqual([]);
    if (mode === 'upgrade') {
      const after = tables.map(table => connection.sqlite.prepare(`SELECT * FROM ${table}`).all().map(row => {
        const fields = { ...(row as Record<string, unknown>) };
        if (table === 'tasks') { expect(fields.recurrence_series_id).toBeNull(); expect(fields.occurrence_key).toBeNull(); delete fields.recurrence_series_id; delete fields.occurrence_key; expect(fields.reminder_time_zone).toBeNull(); delete fields.reminder_time_zone; }
        return fields;
      }));
      expect(after).toEqual(before);
      expect(new TasksRepository(connection.db).findAll(true)[0]).toMatchObject({ id: 't', clientId: 'tc', reminders: [], reminderTimeZone: null });
    }
  } finally { connection.sqlite.close(); rmSync(directory, { recursive: true, force: true }); }
});
