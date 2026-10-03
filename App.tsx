import React from 'react';

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

      </TaskProvider>

    </ProjectProvider>
  );
}