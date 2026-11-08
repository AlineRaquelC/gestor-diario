import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDatabase } from './database/index.js';

const { db, sqlite } = openDatabase();
const app = createApp(db);
const server = app.listen(config.port, () => {
  console.log(`API Gestor Diário disponível na porta ${config.port}`);
});

function shutdown() {
  server.close(() => {
    sqlite.close();
    process.exit(0);
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
