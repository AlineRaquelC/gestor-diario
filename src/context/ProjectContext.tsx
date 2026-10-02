import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Project = {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
};

type ProjectContextType = {
  projects: Project[];

  addProject: (
    project: Project,
  ) => void;

  updateProject: (
    id: string,
    updatedProject: Partial<Project>,
  ) => void;

  deleteProject: (
    id: string,
  ) => void;

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
  const [
    projects,
    setProjects,
  ] = useState<Project[]>(
    initialProjects,
  );

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const storedProjects =
          await AsyncStorage.getItem(
            STORAGE_KEY,
          );

        if (storedProjects) {
          const parsedProjects =
            JSON.parse(
              storedProjects,
            ) as Project[];

          setProjects(
            parsedProjects,
          );
        }
      } catch (error) {
        console.log(
          'Erro ao carregar projetos:',
          error,
        );
      } finally {
        setHydrated(true);
      }
    }

    loadProjects();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    async function saveProjects() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            projects,
          ),
        );
      } catch (error) {
        console.log(
          'Erro ao salvar projetos:',
          error,
        );
      }
    }

    saveProjects();
  }, [
    projects,
    hydrated,
  ]);

  function addProject(
    project: Project,
  ) {
    setProjects(current => [
      ...current,
      project,
    ]);
  }

  function updateProject(
    id: string,
    updatedProject: Partial<Project>,
  ) {
    setProjects(current =>
      current.map(project =>
        project.id === id
          ? {
              ...project,
              ...updatedProject,
            }
          : project,
      ),
    );
  }

  function deleteProject(
    id: string,
  ) {
    setProjects(current =>
      current.filter(
        project =>
          project.id !== id,
      ),
    );
  }

  function getProjectById(
    id: string,
  ) {
    return projects.find(
      project =>
        project.id === id,
    );
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
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