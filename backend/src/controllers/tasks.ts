import type { Request, Response } from 'express';
import { createTaskSchema } from '../schemas/tasks.js';
import type { TasksService } from '../services/tasks.js';

export class TasksController {
  constructor(private readonly service: TasksService) {}
  create = (req: Request, res: Response) => {
    res.status(201).json(this.service.create(createTaskSchema.parse(req.body)));
  };
}
