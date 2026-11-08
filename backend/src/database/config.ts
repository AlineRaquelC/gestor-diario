import 'dotenv/config';
import { fileURLToPath } from 'node:url';

export const databasePath = process.env.DATABASE_PATH ?? './data/gestor-diario.db';
export const migrationsFolder = fileURLToPath(new URL('../../drizzle/', import.meta.url));
