import { Router } from 'express';
import type { NotesController } from '../controllers/notes.js';
export function createNotesRouter(controller: NotesController) {
  const router = Router();
  router.get('/:taskId/notes', controller.findAll);
  router.post('/:taskId/notes', controller.create);
  router.patch('/:taskId/notes/:noteId', controller.update);
  router.delete('/:taskId/notes/:noteId', controller.delete);
  return router;
}
