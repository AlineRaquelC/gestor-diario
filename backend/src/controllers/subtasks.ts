import type { Request, Response } from 'express';
import type { SubtasksService } from '../services/subtasks.js';
import { createSubtaskSchema, updateSubtaskSchema, taskIdSchema, subtaskIdSchema } from '../schemas/subtasks.js';
type Params = { taskId: string; subtaskId: string };
export class SubtasksController {
  constructor(private readonly service: SubtasksService) {}
  create = (req: Request<Params>, res: Response) => {
    res.status(201).json(this.service.create(taskIdSchema.parse(req.params.taskId), createSubtaskSchema.parse(req.body)));
  };
  update = (req: Request<Params>, res: Response) => {
    res.json(this.service.update(taskIdSchema.parse(req.params.taskId), subtaskIdSchema.parse(req.params.subtaskId), updateSubtaskSchema.parse(req.body)));
  };
  delete = (req: Request<Params>, res: Response) => {
    res.json(this.service.delete(taskIdSchema.parse(req.params.taskId), subtaskIdSchema.parse(req.params.subtaskId)));
  };
}
