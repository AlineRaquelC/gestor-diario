import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteProject as remoteDeleteProject } from '../services/projectService';
import { assertDataAvailable, dataGuard } from '../services/dataGuard';

export type Project = {
  id: string;
  remoteId?: string;
  clientId?: string;
  syncPending?: string;
  dirty?: boolean;
  updatedAt?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
};

type ProjectContextType = {
  projects: Project[];
  hydrated: boolean;
  readError: string | null;
  flushProjects: () => Promise<unknown>;
  persistProjects: (projects: Project[]) => Promise<void>;
  publishProjects: (projects: Project[]) => void;

  addProject: (
    project: Project,
  ) => void;

  updateProject: (
    id: string,
    updatedProject: Partial<Project>,
  ) => void;

  deleteProject: (
    id: string,
  ) => Promise<void>;

  getProjectById: (
    id: string,
  ) => Project | undefined;
};

const STORAGE_KEY =
  '@taskflow:projects';

const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'Marketing',
    description:
      'Campanhas e atividades de marketing.',
    color: '#F43F5E',
    icon: '📣',
  },
  {
    id: 'p2',
    name: 'Desenvolvimento',
    description:
      'Atividades relacionadas ao desenvolvimento.',
    color: '#5C4DFF',
    icon: '💻',
  },
  {
    id: 'p3',
    name: 'Produto',
    description:
      'Planejamento e evolução do produto.',
    color: '#FBBF24',
    icon: '📦',
  },
  {
    id: 'p4',
    name: 'Financeiro',
    description:
      'Atividades financeiras.',
    color: '#22C55E',
    icon: '💰',
  },
  {
    id: 'p5',
    name: 'RH',
    description:
      'Atividades de recursos humanos.',
    color: '#06B6D4',
    icon: '👥',
  },
  {
    id: 'p6',
    name: 'Faculdade',
    description:
      'Atividades e trabalhos da faculdade.',
    color: '#8B5CF6',
    icon: '🎓',
  },
  {
    id: 'p7',
    name: 'Geral',
    description:
      'Tarefas gerais.',
    color: '#64748B',
    icon: '📋',
  },
];

const ProjectContext =
  createContext<ProjectContextType | undefined>(
    undefined,
  );

export function ProjectProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const projectsRef = useRef(projects);
  const [hydrated, setHydrated] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const writable = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  function publishProjects(list: Project[]) {projectsRef.current = list; setProjects(list);}
  function persistProjects(list: Project[]) {
    if (!writable.current) {return Promise.reject(new Error('Cache de projetos não carregado com segurança.'));}
    const write = queue.current.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)));
    queue.current = write;
    return write;
  }
  const flushProjects = () => queue.current;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Project[] = stored ? JSON.parse(stored) : initialProjects;
        if (!Array.isArray(parsed) || parsed.some(project => !project || typeof project.id !== 'string')) {
          throw new Error('Cache inválido.');
        }
        if (active) {writable.current = true; publishProjects(parsed);}
      } catch {
        if (active) {setReadError('Cache de projetos indisponível. Conteúdo original preservado.');}
      } finally {if (active) {setHydrated(true);}}
    }
    load();
    return () => {active = false;};
  }, []);
  function change(list: Project[]) {
    assertDataAvailable();
    if (!writable.current) {throw new Error('Aguarde o carregamento seguro dos projetos.');}
    publishProjects(list);
    persistProjects(list).catch(() => setReadError('Não foi possível atualizar o cache de projetos.'));
  }
  function addProject(project: Project) {change([...projectsRef.current, project]);}
  function updateProject(id: string, changes: Partial<Project>) {
    change(projectsRef.current.map(project => project.id === id
      ? { ...project, ...changes, ...(['name', 'description', 'color', 'icon'].some(key => key in changes) ? { dirty: true } : {}) } : project));
  }
  async function deleteProject(id: string) {
    assertDataAvailable();
    if (!writable.current) {throw new Error('Cache de projetos indisponível.');}
    if (dataGuard.activeTasks) {throw new Error('Aguarde as operações de tarefas antes de excluir o projeto.');}
    dataGuard.deletingProject = true;
    try {
      await queue.current;
      const stored = await AsyncStorage.getItem('@taskflow:tasks');
      const tasks: { projectId?: string }[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(tasks)) {throw new Error('Cache de tarefas inválido.');}
      const project = projectsRef.current.find(item => item.id === id);
      if (!project) {throw new Error('Projeto não encontrado.');}
      if (tasks.some(task => !task.projectId || task.projectId === id || task.projectId === project.remoteId)) {
        throw new Error('Não é possível excluir projeto com tarefas vinculadas ou vínculos legados pendentes.');
      }
      if (project.remoteId) {await remoteDeleteProject(project.remoteId);}
      const next = projectsRef.current.filter(item => item.id !== id);
      await persistProjects(next);
      publishProjects(next);
    } finally {dataGuard.deletingProject = false;}
  }
  function getProjectById(id: string) {return projectsRef.current.find(project => project.id === id);}

  return (
    <ProjectContext.Provider
      value={{
        projects,
        hydrated,
        readError,
        flushProjects,
        persistProjects,
        publishProjects,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
      }}>

      {children}

    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context =
    useContext(
      ProjectContext,
    );

  if (!context) {
    throw new Error(
      'useProjects deve ser usado dentro de ProjectProvider',
    );
  }

  return context;
}