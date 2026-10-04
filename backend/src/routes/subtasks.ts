import { Router } from 'express';
import type { SubtasksController } from '../controllers/subtasks.js';
export function createSubtasksRouter(controller: SubtasksController) {
  const router = Router();
  router.post('/:taskId/subtasks', controller.create);
  router.patch('/:taskId/subtasks/:subtaskId', controller.update);
  router.delete('/:taskId/subtasks/:subtaskId', controller.delete);
  return router;
}
