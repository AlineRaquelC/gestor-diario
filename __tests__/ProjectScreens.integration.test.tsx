import React from 'react';
import { Alert, Text, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import ProjectsScreen from '../src/screens/ProjectsScreen';
import ProjectDetailsScreen from '../src/screens/ProjectDetailsScreen';
import CreateProjectScreen from '../src/screens/CreateProjectScreen';
import EditProjectScreen from '../src/screens/EditProjectScreen';
import LoginScreen from '../src/screens/LoginScreen';
import { useProjects } from '../src/context/ProjectContext';
import { useTasks } from '../src/context/TaskContext';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
};
let mockProjectId = 'p1';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { projectId: mockProjectId } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/components/BottomNavigation', () => () => null);
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
const projects = [
  {
    id: 'p1',
    remoteId: 'r1',
    name: 'Marketing',
    description: 'Campanhas',
    color: '#5C4DFF',
    icon: '📣',
  },
  { id: 'p2', remoteId: 'r2', name: 'Marketing', color: '#22C55E', icon: '📦' },
];
const tasks = [
  {
    id: 'a',
    title: 'Primeira',
    projectId: 'p1',
    project: 'Marketing',
    done: false,
    priority: 'high',
    time: '09:00',
  },
  {
    id: 'b',
    title: 'Remota concluída',
    projectId: 'r1',
    project: 'Marketing',
    done: true,
    priority: 'low',
  },
  {
    id: 'c',
    title: 'Homônima',
    projectId: 'r2',
    project: 'Marketing',
    done: false,
    priority: 'medium',
  },
  {
    id: 'legacy',
    title: 'Legada',
    project: 'Marketing',
    done: false,
    priority: 'low',
  },
];
const addProject = jest.fn(),
  updateProject = jest.fn(),
  deleteProject = jest.fn(),
  updateTaskLocal = jest.fn();
let renderer: TestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const controls = () =>
  renderer.root.findAll(node => typeof node.props.onPress === 'function');
const texts = () =>
  renderer.root.findAllByType(Text).map(node => node.props.children);
async function render(screen: React.ReactElement) {
  await act(async () => {
    renderer = TestRenderer.create(screen);
  });
}
async function press(label: string) {
  const control = controls().find(
    node =>
      node.props.accessibilityLabel === label ||
      node.findAllByType(Text).some(child => child.props.children === label),
  );
  expect(control).toBeDefined();
  await act(async () => {
    await control!.props.onPress();
  });
}
async function input(label: string, value: string) {
  await act(async () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === label)!
      .props.onChangeText(value),
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockProjectId = 'p1';
  jest
    .mocked(useProjects)
    .mockReturnValue({
      projects,
      addProject,
      updateProject,
      deleteProject,
    } as unknown as ReturnType<typeof useProjects>);
  jest
    .mocked(useTasks)
    .mockReturnValue({ tasks, updateTaskLocal } as unknown as ReturnType<
      typeof useTasks
    >);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
  jest.restoreAllMocks();
});

it('métricas, progresso por IDs local/remoto e grid preservam homônimos distintos', async () => {
  await render(<ProjectsScreen />);
  const stats = renderer.root.findAll(
    node => node.props.label && typeof node.props.value === 'number',
  );
  expect(stats.map(node => [node.props.label, node.props.value])).toEqual([
    ['Projetos', 2],
    ['Total', 4],
    ['Feitas', 1],
    ['Restantes', 3],
  ]);
  const cards = controls().filter(
    node => node.props.accessibilityLabel === 'Abrir projeto: Marketing',
  );
  expect(cards).toHaveLength(2);
  expect(
    cards[0].findAllByType(Text).map(node => node.props.children),
  ).toContain('📣');
  const percentages = cards.map(
    card =>
      card
        .findAllByType(Text)
        .find(
          node =>
            Array.isArray(node.props.children) &&
            node.props.children[1] === '%',
        )!.props.children[0],
  );
  expect(percentages).toEqual([50, 0]);
  await act(async () => cards[1].props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('DetalheProjeto', {
    projectId: 'p2',
  });
  await press('Novo projeto');
  expect(mockNavigation.navigate).toHaveBeenCalledWith('CriarProjeto');
});
it('detalhes mostram somente tarefas vinculadas por ID e preservam navegação/editar', async () => {
  await render(<ProjectDetailsScreen />);
  expect(texts()).toEqual(
    expect.arrayContaining([
      'Primeira',
      'Remota concluída',
      '09:00',
      'Sem horário',
      '📣',
    ]),
  );
  expect(texts()).not.toContain('Homônima');
  expect(texts()).not.toContain('Legada');
  await press('Abrir tarefa: Primeira');
  expect(mockNavigation.navigate).toHaveBeenCalledWith('DetalheTarefa', {
    taskId: 'a',
  });
  await press('Editar projeto');
  expect(mockNavigation.navigate).toHaveBeenCalledWith('EditarProjeto', {
    projectId: 'p1',
  });
  await press('Excluir');
  expect(alert).toHaveBeenCalledWith(
    'Excluir projeto',
    expect.any(String),
    expect.any(Array),
  );
  expect(alert.mock.calls[0][2][0]).toMatchObject({
    text: 'Cancelar',
    style: 'cancel',
  });
  expect(deleteProject).not.toHaveBeenCalled();
});
it('detalhes vazios são textuais e exclusão mantém a operação existente', async () => {
  jest
    .mocked(useTasks)
    .mockReturnValue({ tasks: [] } as unknown as ReturnType<typeof useTasks>);
  await render(<ProjectDetailsScreen />);
  expect(texts()).toContain('Nenhuma tarefa');
  expect(texts()).not.toContain('📋');
  await press('Excluir');
  await act(async () => alert.mock.calls[0][2][1].onPress());
  expect(deleteProject).toHaveBeenCalledWith('p1');
  expect(mockNavigation.goBack).toHaveBeenCalled();
});
it('criar preserva nome, catálogo de ícones/cores, preview e valores salvos', async () => {
  await render(<CreateProjectScreen />);
  expect(
    controls().find(node => node.props.disabled)?.props.accessibilityState
      .disabled,
  ).toBe(true);
  await input('Nome do projeto', ' Projeto visual ');
  await input('Descrição', ' Descrição ');
  await press('Ícone 💻');
  await press('Cor #22C55E');
  expect(
    controls().find(node => node.props.accessibilityLabel === 'Ícone 💻')!.props
      .accessibilityState.selected,
  ).toBe(true);
  expect(
    controls().find(node => node.props.accessibilityLabel === 'Cor #22C55E')!
      .props.accessibilityState.selected,
  ).toBe(true);
  expect(texts()).toContain(' Projeto visual ');
  await press('Criar projeto');
  expect(addProject).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Projeto visual',
      description: 'Descrição',
      icon: '💻',
      color: '#22C55E',
    }),
  );
});
it('editar salva ícone/cor e renomeia apenas tarefas do mesmo ID', async () => {
  await render(<EditProjectScreen />);
  await input('Nome do projeto', 'Novo nome');
  await press('Ícone 📦');
  await press('Cor #F43F5E');
  await press('✓ Salvar alterações');
  expect(updateProject).toHaveBeenCalledWith(
    'p1',
    expect.objectContaining({
      name: 'Novo nome',
      icon: '📦',
      color: '#F43F5E',
    }),
  );
  expect(updateTaskLocal.mock.calls).toEqual([
    ['a', { project: 'Novo nome' }],
    ['b', { project: 'Novo nome' }],
  ]);
});
it('zona de perigo preserva confirmação e erro de exclusão sem navegar', async () => {
  deleteProject.mockRejectedValueOnce(
    new Error('Projeto possui tarefas vinculadas'),
  );
  await render(<EditProjectScreen />);
  await press('Excluir projeto');
  expect(deleteProject).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls[0][2][1].onPress());
  expect(alert).toHaveBeenLastCalledWith(
    'Não foi possível excluir',
    'Projeto possui tarefas vinculadas',
  );
  expect(mockNavigation.reset).not.toHaveBeenCalled();
});
it('login mantém inputs e Entrar navega sem autenticação ou novas ações nos links', async () => {
  await render(<LoginScreen />);
  await input('E-mail', 'visual@example.test');
  await input('Senha', 'teste-local');
  expect(
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Senha')!.props
      .secureTextEntry,
  ).toBe(true);
  expect(texts()).toEqual(
    expect.arrayContaining([
      'Gestor Diário',
      'Esqueci minha senha',
      'Criar conta',
    ]),
  );
  await press('Entrar');
  expect(mockNavigation.replace).toHaveBeenCalledWith('Home');
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
