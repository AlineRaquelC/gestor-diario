import cors from 'cors';
import express from 'express';
import type { openDatabase } from './database/index.js';
import { healthRouter } from './routes/health.js';
import { createProjectsRouter } from './routes/projects.js';
import { ProjectsController } from './controllers/projects.js';
import { ProjectsService } from './services/projects.js';
import { ProjectsRepository } from './repositories/projects.js';
import { errorHandler } from './middlewares/error-handler.js';

// The entry point owns the database; tests inject an isolated connection.
export function createApp(db: ReturnType<typeof openDatabase>['db']) {
  const app = express();
  const controller = new ProjectsController(new ProjectsService(new ProjectsRepository(db)));
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use('/projects', createProjectsRouter(controller));
  app.use(errorHandler);
  return app;
}
