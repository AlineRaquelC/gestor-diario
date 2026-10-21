export class ProjectError extends Error {
  constructor(public readonly code: 'PROJECT_NOT_FOUND' | 'PROJECT_HAS_TASKS' | 'PROJECT_CONFLICT') {
    super(code === 'PROJECT_NOT_FOUND'
      ? 'Projeto não encontrado.'
      : code === 'PROJECT_CONFLICT' ? 'O projeto foi alterado no servidor. Sincronize novamente; a versão local foi preservada.'
      : 'O projeto possui tarefas vinculadas e não pode ser excluído.');
  }
}
