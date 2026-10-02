import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority =
  | 'high'
  | 'medium'
  | 'low';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'completed';

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;

  title: string;

  description?: string;

  project: string;

  time?: string;

  priority: Priority;

  status: TaskStatus;

  done: boolean;

  startDate?: string;

  dueDate?: string;

  subtasks?: Subtask[];

  reminders?: string[];
};

type TaskContextType = {
  tasks: Task[];

  toggleTask: (
    id: string,
  ) => void;

  deleteTask: (
    id: string,
  ) => void;

  addTask: (
    task: Task,
  ) => void;

  updateTask: (
    id: string,
    updatedTask: Partial<Task>,
  ) => void;

  getTaskById: (
    id: string,
  ) => Task | undefined;
};

const STORAGE_KEY =
  '@taskflow:tasks';

const initialTasks: Task[] = [
  {
    id: '1',

    title:
      'Criar telas no Figma',

    description:
      'Finalizar protótipo das telas para apresentação da disciplina.',

    project:
      'Faculdade',

    time:
      '18:00',

    priority:
      'high',

    status:
      'in_progress',

    done:
      false,

    startDate:
      new Date(
        2026,
        8,
        20,
      ).toISOString(),

    dueDate:
      new Date(
        2026,
        8,
        21,
      ).toISOString(),

    subtasks: [
      {
        id: 's1',
        title:
          'Criar backlog',
        done:
          true,
      },
      {
        id: 's2',
        title:
          'Configurar ambiente',
        done:
          true,
      },
      {
        id: 's3',
        title:
          'Criar telas no Figma',
        done:
          false,
      },
      {
        id: 's4',
        title:
          'Preparar apresentação',
        done:
          false,
      },
    ],

    reminders:
      [],
  },

  {
    id: '2',

    title:
      'Revisar proposta do cliente',

    description:
      'Revisar os pontos principais da proposta.',

    project:
      'Marketing',

    time:
      '09:00',

    priority:
      'high',

    status:
      'todo',

    done:
      false,

    startDate:
      new Date(
        2026,
        8,
        20,
      ).toISOString(),

    dueDate:
      new Date(
        2026,
        8,
        22,
      ).toISOString(),

    subtasks:
      [],

    reminders:
      [],
  },

  {
    id: '3',

    title:
      'Reunião de alinhamento',

    description:
      'Reunião para alinhamento das atividades.',

    project:
      'Geral',

    time:
      '10:30',

    priority:
      'medium',

    status:
      'in_progress',

    done:
      false,

    startDate:
      new Date(
        2026,
        8,
        20,
      ).toISOString(),

    dueDate:
      new Date(
        2026,
        8,
        23,
      ).toISOString(),

    subtasks:
      [],

    reminders:
      [],
  },

  {
    id: '4',

    title:
      'Atualizar documentação da API',

    description:
      'Atualizar documentação técnica.',

    project:
      'Desenvolvimento',

    time:
      '14:00',

    priority:
      'low',

    status:
      'completed',

    done:
      true,

    startDate:
      new Date(
        2026,
        8,
        19,
      ).toISOString(),

    dueDate:
      new Date(
        2026,
        8,
        20,
      ).toISOString(),

    subtasks:
      [],

    reminders:
      [],
  },
];

const TaskContext =
  createContext<
    TaskContextType | undefined
  >(undefined);

export function TaskProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    initialTasks,
  );

  /*
   * Evita salvar os dados iniciais
   * antes de terminar de carregar
   * o AsyncStorage.
   */
  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /*
   * Carrega as tarefas salvas
   * quando o aplicativo inicia.
   */
  useEffect(() => {
    async function loadTasks() {
      try {
        const storedTasks =
          await AsyncStorage.getItem(
            STORAGE_KEY,
          );

        if (storedTasks) {
          const parsedTasks =
            JSON.parse(
              storedTasks,
            ) as Task[];

          setTasks(
            parsedTasks,
          );
        }
      } catch (error) {
        console.log(
          'Erro ao carregar tarefas:',
          error,
        );
      } finally {
        setHydrated(true);
      }
    }

    loadTasks();
  }, []);

  /*
   * Sempre que a lista mudar,
   * salva automaticamente.
   */
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    async function saveTasks() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            tasks,
          ),
        );
      } catch (error) {
        console.log(
          'Erro ao salvar tarefas:',
          error,
        );
      }
    }

    saveTasks();
  }, [
    tasks,
    hydrated,
  ]);

  function toggleTask(
    id: string,
  ) {
    setTasks(current =>
      current.map(task => {
        if (
          task.id !== id
        ) {
          return task;
        }

        const newDone =
          !task.done;

        return {
          ...task,

          done:
            newDone,

          status:
            newDone
              ? 'completed'
              : 'in_progress',
        };
      }),
    );
  }

  function deleteTask(
    id: string,
  ) {
    setTasks(current =>
      current.filter(
        task =>
          task.id !== id,
      ),
    );
  }

  function addTask(
    task: Task,
  ) {
    setTasks(current => [
      ...current,
      task,
    ]);
  }

  function updateTask(
    id: string,
    updatedTask:
      Partial<Task>,
  ) {
    setTasks(current =>
      current.map(task =>
        task.id === id
          ? {
              ...task,
              ...updatedTask,
            }
          : task,
      ),
    );
  }

  function getTaskById(
    id: string,
  ) {
    return tasks.find(
      task =>
        task.id === id,
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        toggleTask,
        deleteTask,
        addTask,
        updateTask,
        getTaskById,
      }}>

      {children}

    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context =
    useContext(
      TaskContext,
    );

  if (!context) {
    throw new Error(
      'useTasks deve ser usado dentro de TaskProvider',
    );
  }

  return context;
}