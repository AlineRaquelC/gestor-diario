import { defineConfig } from 'drizzle-kit';
import { databasePath } from './src/database/config.js';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: databasePath },
});
