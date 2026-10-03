import type { Request, Response } from 'express';
import { ProjectsService } from '../services/projects.js';
import { createProjectSchema, projectIdSchema, updateProjectSchema } from '../schemas/projects.js';

export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  create = (req: Request, res: Response) => {
    const project = this.service.create(createProjectSchema.parse(req.body));
    res.status(201).json(project);
  };

  findAll = (_req: Request, res: Response) => {
    res.json(this.service.findAll());
  };

  findById = (req: Request, res: Response) => {
    res.json(this.service.findById(projectIdSchema.parse(req.params.id)));
  };

  update = (req: Request, res: Response) => {
    const id = projectIdSchema.parse(req.params.id);
    const input = updateProjectSchema.parse(req.body);
    res.json(this.service.update(id, input));
  };

  delete = (req: Request, res: Response) => {
    this.service.delete(projectIdSchema.parse(req.params.id));
    res.status(204).end();
  };
}
