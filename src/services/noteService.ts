import { apiRequest } from './api';
import type { Note } from '../models/note';
const path = (taskId: string) => `/tasks/${encodeURIComponent(taskId)}/notes`;
export const getTaskNotes = (taskId: string) => apiRequest<Note[]>(path(taskId));
export const createTaskNote = (taskId: string, content: string) =>
  apiRequest<Note>(path(taskId), 'POST', { content });
export const updateTaskNote = (taskId: string, noteId: string, content: string) =>
  apiRequest<Note>(`${path(taskId)}/${encodeURIComponent(noteId)}`, 'PATCH', { content });
export const deleteTaskNote = (taskId: string, noteId: string) =>
  apiRequest<{ id: string; taskId: string; updatedAt: string }>(`${path(taskId)}/${encodeURIComponent(noteId)}`, 'DELETE');
