import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory } from '../src/database/schema/index.js';

let connection: ReturnType<typeof openDatabase>;

const project = { id: 'project-001', name: 'Projeto', color: '#8B5CF6', icon: '🎓' };
const task = {
  id: 'task-001', title: 'Tarefa', projectId: project.id,
  startDate: '2026-10-02', dueDate: '2026-10-04', priority: 'HIGH' as const,
};

function seedParents() {
  connection.db.insert(projects).values(project).run();
  connection.db.insert(tasks).values(task).run();
}

describe('schema e migration SQLite', () => {
  beforeEach(() => {
    connection = openDatabase(':memory:');
    migrate(connection.db, { migrationsFolder });
  });

  afterEach(() => connection?.sqlite.close());

  it('cria as cinco tabelas em banco vazio e permite reaplicar a migration', () => {
    const names = connection.sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT GLOB '__*' ORDER BY name",
    ).all();
    expect(names).toEqual(['notes', 'projects', 'subtasks', 'task_history', 'tasks'].map(name => ({ name })));
    seedParents();
    expect(() => migrate(connection.db, { migrationsFolder })).not.toThrow();
    expect(connection.db.select().from(tasks).all()).toHaveLength(1);
    expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
  });

  it('mantém IDs string, datas, defaults e timestamps ISO 8601 UTC', () => {
    seedParents();
    const stored = connection.db.select().from(tasks).get()!;
    expect(stored).toMatchObject({ ...task, status: 'PENDING', done: false, progress: 0, favorite: false, deletedAt: null, undoUntil: null });
    expect(stored.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(stored.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('habilita foreign keys e rejeita tarefa com projeto inexistente', () => {
    expect(connection.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(() => connection.sqlite.prepare(
      "INSERT INTO tasks (id, title, project_id, start_date, due_date, priority) VALUES ('t', 'T', 'missing', '2026-10-02', '2026-10-04', 'LOW')",
    ).run()).toThrow(/FOREIGN KEY/);
  });

  it.each([
    ['subtasks', "INSERT INTO subtasks (id, task_id, title) VALUES ('s', 'missing', 'S')"],
    ['notes', "INSERT INTO notes (id, task_id, content) VALUES ('n', 'missing', 'N')"],
    ['task_history', "INSERT INTO task_history (id, task_id, action) VALUES ('h', 'missing', 'CREATED')"],
  ])('rejeita vínculo órfão em %s', (_table, query) => {
    expect(() => connection.sqlite.prepare(query).run()).toThrow(/FOREIGN KEY/);
  });

  it('impede exclusão física de projeto com tarefas', () => {
    seedParents();
    expect(() => connection.sqlite.prepare('DELETE FROM projects WHERE id = ?').run(project.id)).toThrow(/FOREIGN KEY/);
  });

  it.each([
    ['subtasks', "INSERT INTO subtasks (id, task_id, title) VALUES ('s', 'task-001', 'S')"],
    ['notes', "INSERT INTO notes (id, task_id, content) VALUES ('n', 'task-001', 'N')"],
    ['task_history', "INSERT INTO task_history (id, task_id, action) VALUES ('h', 'task-001', 'CREATED')"],
  ])('preserva %s ao tentar excluir fisicamente a tarefa', (_table, query) => {
    seedParents();
    connection.sqlite.prepare(query).run();
    expect(() => connection.sqlite.prepare('DELETE FROM tasks WHERE id = ?').run(task.id)).toThrow(/FOREIGN KEY/);
  });

  it.each([
    ['priority', 'URGENT'], ['status', 'INVALID'],
    ['progress', -1], ['progress', 101], ['progress', 1.5],
    ['done', 2], ['favorite', 2], ['title', '   '],
  ])('rejeita %s inválido (%s) no banco', (column, value) => {
    seedParents();
    expect(() => connection.sqlite.prepare(`UPDATE tasks SET ${column} = ? WHERE id = ?`).run(value, task.id)).toThrow(/CHECK constraint/);
  });

  it.each([0, 100])('aceita progress no limite %s', progress => {
    seedParents();
    connection.sqlite.prepare('UPDATE tasks SET progress = ? WHERE id = ?').run(progress, task.id);
    expect(connection.db.select().from(tasks).get()!.progress).toBe(progress);
  });

  it.each([
    "INSERT INTO projects (id, color, icon) VALUES ('p', '#fff', 'P')",
    "INSERT INTO projects (id, name, icon) VALUES ('p', 'P', 'P')",
    "INSERT INTO projects (id, name, color) VALUES ('p', 'P', '#fff')",
    "INSERT INTO tasks (id, project_id, start_date, due_date, priority) VALUES ('t', 'project-001', '2026-10-02', '2026-10-04', 'LOW')",
    "INSERT INTO tasks (id, title, start_date, due_date, priority) VALUES ('t', 'T', '2026-10-02', '2026-10-04', 'LOW')",
  ])('rejeita ausência de campo obrigatório: %s', query => {
    connection.db.insert(projects).values(project).run();
    expect(() => connection.sqlite.prepare(query).run()).toThrow(/NOT NULL/);
  });

  it('rejeita chave primária duplicada e nome vazio', () => {
    connection.db.insert(projects).values(project).run();
    expect(() => connection.sqlite.prepare('INSERT INTO projects (id, name, color, icon) VALUES (?, ?, ?, ?)').run(project.id, 'Outro', '#fff', 'P')).toThrow(/UNIQUE/);
    expect(() => connection.sqlite.prepare("UPDATE projects SET name = '   '").run()).toThrow(/CHECK constraint/);
  });

  it('rejeita título vazio e done inválido em subtarefas', () => {
    seedParents();
    const insert = connection.sqlite.prepare('INSERT INTO subtasks (id, task_id, title, done) VALUES (?, ?, ?, ?)');
    expect(() => insert.run('s', task.id, '   ', 0)).toThrow(/CHECK constraint/);
    expect(() => insert.run('s', task.id, 'S', 2)).toThrow(/CHECK constraint/);
  });

  it('rejeita conteúdo vazio em notas', () => {
    seedParents();
    expect(() => connection.sqlite.prepare("INSERT INTO notes (id, task_id, content) VALUES ('n', 'task-001', '   ')").run()).toThrow(/CHECK constraint/);
  });

  it('modela ações e metadata JSON sem criar histórico automaticamente', () => {
    seedParents();
    expect(connection.db.select().from(taskHistory).all()).toEqual([]);
    const actions = ['CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED', 'REOPENED', 'DELETED', 'RESTORED', 'PROJECT_CHANGED'] as const;
    for (const action of actions) {
      connection.db.insert(taskHistory).values({ id: action, taskId: task.id, action, metadata: { source: 'test' } }).run();
    }
    expect(connection.db.select().from(taskHistory).all()).toHaveLength(8);
    expect(connection.db.select().from(taskHistory).get()!.metadata).toEqual({ source: 'test' });
    expect(() => connection.sqlite.prepare("INSERT INTO task_history (id, task_id, action) VALUES ('invalid', 'task-001', 'INVALID')").run()).toThrow(/CHECK constraint/);
  });
});
