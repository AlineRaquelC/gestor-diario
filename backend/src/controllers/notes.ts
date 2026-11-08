import type { Request, Response } from 'express';
import type { NotesService } from '../services/notes.js';
import { taskIdSchema, noteIdSchema, createNoteSchema, updateNoteSchema } from '../schemas/notes.js';
type Params = { taskId: string; noteId: string };
export class NotesController {
  constructor(private readonly service: NotesService) {}
  findAll = (req: Request<Params>, res: Response) => {
    res.json(this.service.findAll(taskIdSchema.parse(req.params.taskId)));
  };
  create = (req: Request<Params>, res: Response) => {
    res.status(201).json(this.service.create(taskIdSchema.parse(req.params.taskId), createNoteSchema.parse(req.body)));
  };
  update = (req: Request<Params>, res: Response) => {
    res.json(this.service.update(taskIdSchema.parse(req.params.taskId), noteIdSchema.parse(req.params.noteId), updateNoteSchema.parse(req.body)));
  };
  delete = (req: Request<Params>, res: Response) => {
    res.json(this.service.delete(taskIdSchema.parse(req.params.taskId), noteIdSchema.parse(req.params.noteId)));
  };
}
