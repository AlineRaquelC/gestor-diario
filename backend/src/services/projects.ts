import { randomUUID } from 'node:crypto';
import { ProjectError } from '../errors/projects.js';
import { ProjectsRepository } from '../repositories/projects.js';
import type { CreateProject, UpdateProject } from '../schemas/projects.js';

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  create(input: CreateProject) {
    const timestamp = new Date().toISOString();
    return this.repository.create({
      ...input, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp,
    });
  }

  findAll() {
    return this.repository.findAll();
  }

  findById(id: string) {
    const project = this.repository.findById(id);
    if (!project) throw new ProjectError('PROJECT_NOT_FOUND');
    return project;
  }

  update(id: string, input: UpdateProject) {
    const project = this.repository.update(id, input, new Date().toISOString());
    if (!project) throw new ProjectError('PROJECT_NOT_FOUND');
    return project;
  }

  delete(id: string) {
    return this.repository.transaction(() => {
      this.findById(id);
      if (this.repository.hasTasks(id)) throw new ProjectError('PROJECT_HAS_TASKS');
      // Keep the row for audit; do not reassign or remove any tasks.
      this.repository.softDelete(id, new Date().toISOString());
    });
  }
}
