import { Router } from 'express';
import type { TasksController } from '../controllers/tasks.js';

export function createTasksRouter(controller: TasksController) {
  const router = Router();
  router.get('/', controller.findAll);
  router.get('/:id', controller.findById);
  router.post('/', controller.create);
  return router;
}
