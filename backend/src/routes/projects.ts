import { Router } from 'express';
import type { ProjectsController } from '../controllers/projects.js';

export function createProjectsRouter(controller: ProjectsController) {
  const router = Router();
  router.post('/', controller.create);
  router.get('/', controller.findAll);
  router.get('/:id', controller.findById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);
  return router;
}
