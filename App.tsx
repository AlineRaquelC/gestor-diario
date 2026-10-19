import React from 'react';

import TaskUndoFeedback from './src/components/TaskUndoFeedback';
import AppNavigator from './src/navigation/AppNavigator';

import {
  TaskProvider,
} from './src/context/TaskContext';

import {
  ProjectProvider,
} from './src/context/ProjectContext';

export default function App() {
  return (
    <ProjectProvider>

      <TaskProvider>

        <AppNavigator />
        <TaskUndoFeedback />

      </TaskProvider>

    </ProjectProvider>
  );
}