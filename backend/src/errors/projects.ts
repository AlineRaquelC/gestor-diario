export class ProjectError extends Error {
  constructor(public readonly code: 'PROJECT_NOT_FOUND' | 'PROJECT_HAS_TASKS') {
    super(code === 'PROJECT_NOT_FOUND'
      ? 'Projeto não encontrado.'
      : 'O projeto possui tarefas vinculadas e não pode ser excluído.');
  }
}
