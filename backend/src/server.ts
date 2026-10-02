import { app } from './app.js';
import { config } from './config/env.js';

app.listen(config.port, () => {
  console.log(`API Gestor Diário disponível na porta ${config.port}`);
});
