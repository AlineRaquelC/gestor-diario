import React from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewTaskScreen from '../screens/NewTaskScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import EditTaskScreen from '../screens/EditTaskScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateProjectScreen from '../screens/CreateProjectScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import EditProjectScreen from '../screens/EditProjectScreen';

export type RootStackParamList = {
  Login: undefined;

  Home: undefined;

  NovaTarefa: undefined;

  DetalheTarefa: {
    taskId: string;
  };

  EditarTarefa: {
    taskId?: string;
  };

  Projetos: undefined;

  DetalheProjeto: {
  projectId: string;
};


  Calendario: undefined;

  Configuracoes: undefined;


  CriarProjeto: undefined;

  EditarProjeto: {
    projectId: string;
  };
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>

      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}>

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="NovaTarefa"
          component={NewTaskScreen}
        />

        <Stack.Screen
          name="DetalheTarefa"
          component={TaskDetailsScreen}
        />

        <Stack.Screen
          name="EditarTarefa"
          component={EditTaskScreen}
        />

        <Stack.Screen
          name="Projetos"
          component={ProjectsScreen}
        />

        <Stack.Screen
          name="Calendario"
          component={CalendarScreen}
        />

        <Stack.Screen
          name="Configuracoes"
          component={SettingsScreen}
        />

        <Stack.Screen
          name="CriarProjeto"
          component={CreateProjectScreen}
        />

        <Stack.Screen
          name="DetalheProjeto"
          component={ProjectDetailsScreen}
        />

        <Stack.Screen
          name="EditarProjeto"
          component={EditProjectScreen}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}
