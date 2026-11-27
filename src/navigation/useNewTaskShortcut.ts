import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { StackActions, type NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import type { RootStackParamList } from './AppNavigator';

// The native sequence is monotonic within the Android process. Keep only the
// last consumed ID, including across Activity recreation in that process.
let lastConsumed = 0;

function deliveryId(url: string | null | undefined): number {
  const match = url?.match(/^gestordiario:\/\/shortcut\/new-task\/([1-9][0-9]*)$/);
  const id = Number(match?.[1]);
  return match?.[0] === url && Number.isSafeInteger(id) ? id : 0;
}

export function useNewTaskShortcut(
  navigation: NavigationContainerRefWithCurrent<RootStackParamList>,
  ready: boolean,
) {
  const { hydrated, readError: projectError } = useProjects();
  const { loading, readError: taskError } = useTasks();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {return;}
    let active = true;
    function retain(url: string | null | undefined) {
      const id = deliveryId(url);
      if (active && id > lastConsumed) {
        setPending(previous => Math.max(previous, id));
      }
    }

    function readLatest() {
      Linking.getInitialURL().then(retain, () => {});
    }

    const urls = Linking.addEventListener('url', event => retain(event.url));
    const lifecycle = AppState.addEventListener('change', state => {
      if (state === 'active') {readLatest();}
    });
    readLatest();

    return () => {
      active = false;
      urls.remove();
      lifecycle.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !hydrated || loading || pending <= lastConsumed) {return;}
    const state = navigation.getRootState();
    if (!state) {return;}

    lastConsumed = pending;
    if (projectError || taskError) {
      Alert.alert('Nova tarefa', 'Não foi possível carregar os projetos ou as tarefas. Verifique a tela inicial e tente novamente.');
      return;
    }

    const route = state.routes[state.index];
    if (route.name === 'NovaTarefa') {return;}
    if (route.name === 'Login') {
      // This stack has a visual Login only. Revisit this entry point when
      // authentication is introduced.
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'NovaTarefa' }] });
    } else if (state.routes.some(screen => screen.name === 'NovaTarefa')) {
      navigation.dispatch(StackActions.popTo('NovaTarefa'));
    } else {
      navigation.dispatch(StackActions.push('NovaTarefa'));
    }
  }, [hydrated, loading, navigation, pending, projectError, ready, taskError]);
}
