import { randomUUID } from 'node:crypto';
import { ProjectError } from '../errors/projects.js';
import { ProjectsRepository } from '../repositories/projects.js';
import type { CreateProject, UpdateProject } from '../schemas/projects.js';

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  create(input: CreateProject) {
    return this.repository.transaction(() => {
      if (input.clientId) {
        const existing = this.repository.findByClientId(input.clientId);
        if (existing) return existing;
      }
      const timestamp = new Date().toISOString();
      return this.repository.create({
        ...input, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp,
      });
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
    return this.repository.transaction(() => {
      const current = this.findById(id);
      const { expectedUpdatedAt, ...changes } = input;
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== current.updatedAt) {
        throw new ProjectError('PROJECT_CONFLICT');
      }
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
      return this.repository.update(id, changes, updatedAt)!;
    });
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
