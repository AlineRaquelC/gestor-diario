// Shared only by Contexts; no network or background synchronization.
export const dataGuard = { syncing: false, deletingProject: false, activeTasks: 0 };
export function assertDataAvailable() {
  if (dataGuard.syncing || dataGuard.deletingProject) {throw new Error('Aguarde a operação de dados em andamento.');}
}
