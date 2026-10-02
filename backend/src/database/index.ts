import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { databasePath } from './config.js';
import * as schema from './schema/index.js';

// No connection is opened on import; callers own the connection lifecycle.
export function openDatabase(path = databasePath) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const sqlite = new Database(path);
  try {
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    return { db, sqlite };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
