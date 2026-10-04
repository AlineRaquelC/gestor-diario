export type Note = {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
