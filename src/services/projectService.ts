import type { Project } from '../context/ProjectContext';
import { apiRequest } from './api';

export type ApiProject = Omit<Project, 'remoteId' | 'dirty' | 'syncPending'> & { deletedAt?: string | null };
export const listProjects = () => apiRequest<ApiProject[]>('/projects');
export const createProject = (project: Project, clientId: string) => apiRequest<ApiProject>('/projects', 'POST', {
  name: project.name, description: project.description, color: project.color, icon: project.icon, clientId,
});
export const updateProject = (id: string, project: Project) => apiRequest<ApiProject>(`/projects/${encodeURIComponent(id)}`, 'PATCH', {
  name: project.name, description: project.description, color: project.color, icon: project.icon, expectedUpdatedAt: project.updatedAt,
});
export const deleteProject = (id: string) => apiRequest<void>(`/projects/${encodeURIComponent(id)}`, 'DELETE');
