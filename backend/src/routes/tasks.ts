import { Router } from 'express';
import type { TasksController } from '../controllers/tasks.js';

export function createTasksRouter(controller: TasksController) {
  const router = Router();
  router.post('/', controller.create);
  return router;
}
