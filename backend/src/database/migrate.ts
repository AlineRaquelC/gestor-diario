import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { openDatabase } from './index.js';
import { migrationsFolder } from './config.js';

const { db, sqlite } = openDatabase();
try {
  migrate(db, { migrationsFolder });
  console.log('Migrations SQLite aplicadas.');
} finally {
  sqlite.close();
}
