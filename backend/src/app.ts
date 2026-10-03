import cors from 'cors';
import express from 'express';
import type { openDatabase } from './database/index.js';
import { healthRouter } from './routes/health.js';
import { createProjectsRouter } from './routes/projects.js';
import { ProjectsController } from './controllers/projects.js';
import { ProjectsService } from './services/projects.js';
import { ProjectsRepository } from './repositories/projects.js';
import { createTasksRouter } from './routes/tasks.js';
import { TasksController } from './controllers/tasks.js';
import { TasksService } from './services/tasks.js';
import { TasksRepository } from './repositories/tasks.js';
import { errorHandler } from './middlewares/error-handler.js';

// The entry point owns the database; tests inject an isolated connection.
export function createApp(db: ReturnType<typeof openDatabase>['db']) {
  const app = express();
  const controller = new ProjectsController(new ProjectsService(new ProjectsRepository(db)));
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use('/projects', createProjectsRouter(controller));
  app.use('/tasks', createTasksRouter(new TasksController(
    new TasksService(new TasksRepository(db), new ProjectsRepository(db)),
  )));
  app.use(errorHandler);
  return app;
}
