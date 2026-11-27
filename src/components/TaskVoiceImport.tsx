import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { interpretTaskVoice, type VoiceDraft } from '../domain/taskVoice';
import voice from '../../specs/NativeTaskVoice';
import { COLORS, RADIUS, SPACING } from '../styles/theme';
import { taskFormStyles } from '../styles/taskFormStyles';

const unavailable = 'O reconhecimento de voz local não está disponível neste aparelho. Você pode digitar a tarefa.';

type Props = {
  disabled: boolean;
  onDraft: (draft: VoiceDraft) => string | undefined;
  onBusyChange: (busy: boolean) => void;
};

export default function TaskVoiceImport({ disabled, onDraft, onBusyChange }: Props) {
  const navigation = useNavigation();
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'listening'>('idle');
  const [feedback, setFeedback] = useState('');
  const [original, setOriginal] = useState('');
  const [transcript, setTranscript] = useState('');
  const session = useRef<symbol | null>(null);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('blur', () => {
      if (!session.current) {return;}
      session.current = null;
      voice?.cancel().catch(() => undefined);
      setPhase('idle');
      setFeedback('Captura cancelada.');
      busyCallback.current(false);
    });
    return () => {
      unsubscribe?.();
      if (session.current) {
        session.current = null;
        voice?.cancel().catch(() => undefined);
      }
    };
  }, [navigation]);

  async function start() {
    if (disabled || session.current) {return;}
    if (Platform.OS !== 'android' || !voice) {
      setFeedback(unavailable);
      return;
    }
    const token = Symbol();
    session.current = token;
    setPhase('preparing');
    onBusyChange(true);
    setFeedback('Preparando o microfone…');
    try {
      const available = await voice.isAvailable();
      if (session.current !== token) {return;}
      if (!available) {
        setFeedback(unavailable);
        return;
      }
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (session.current !== token) {return;}
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setFeedback('Microfone não autorizado. Você pode continuar digitando.');
        return;
      }
      if (AppState.currentState === 'background') {
        setFeedback('Captura cancelada.');
        return;
      }
      setPhase('listening');
      setFeedback('Ouvindo em português do Brasil…');
      const result = await voice.start();
      if (session.current !== token) {return;}
      setOriginal(result);
      setTranscript(result);
      setFeedback('Revise a transcrição antes de preencher o formulário.');
    } catch (error) {
      if (session.current === token) {
        setFeedback(error instanceof Error ? error.message : 'Não foi possível reconhecer a fala. Você pode continuar digitando.');
      }
    } finally {
      if (session.current === token) {
        session.current = null;
        setPhase('idle');
        onBusyChange(false);
      }
    }
  }

  async function cancel() {
    if (phase !== 'listening' || !session.current) {return;}
    // Invalidate any result already queued for JS before asking Android to stop.
    const cancelled = Symbol();
    session.current = cancelled;
    try {
      await voice?.cancel();
    } catch {
      // Native timeout and lifecycle cleanup still release the recognizer.
    } finally {
      if (session.current === cancelled) {
        session.current = null;
        setPhase('idle');
        setFeedback('Captura cancelada.');
        onBusyChange(false);
      }
    }
  }

  function interpret() {
    if (disabled || session.current) {return;}
    const result = interpretTaskVoice(transcript, new Date());
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    const warning = onDraft(result.draft);
    setFeedback([result.draft.warning, warning, 'Revise os campos antes de criar a tarefa.'].filter(Boolean).join(' '));
  }

  if (Platform.OS !== 'android') {return null;}
  const busy = phase !== 'idle';
  return (
    <View style={styles.container}>
      <Text style={styles.help}>O reconhecimento usa o microfone e o serviço local do Android.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar por voz"
        accessibilityState={{ disabled: disabled || busy, busy }}
        disabled={disabled || busy}
        style={[styles.button, (disabled || busy) && styles.disabled]}
        onPress={start}
      >
        <Text style={styles.label}>🎙 Criar por voz</Text>
      </Pressable>
      {phase === 'listening' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Cancelar captura" style={styles.button} onPress={cancel}>
          <Text style={styles.label}>Cancelar captura</Text>
        </Pressable>
      )}
      {original !== '' && (
        <>
          {original !== transcript && <Text style={styles.help}>Original: {original}</Text>}
          <Text style={taskFormStyles.label}>Transcrição</Text>
          <TextInput
            accessibilityLabel="Transcrição"
            editable={!busy && !disabled}
            multiline
            onChangeText={setTranscript}
            value={transcript}
            style={[taskFormStyles.input, taskFormStyles.textArea]}
          />
          <Text style={styles.help}>O título e os campos identificados substituirão os correspondentes no formulário.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Interpretar e preencher"
            accessibilityState={{ disabled: disabled || busy }}
            disabled={disabled || busy}
            style={[styles.button, (disabled || busy) && styles.disabled]}
            onPress={interpret}
          >
            <Text style={styles.label}>Interpretar e preencher</Text>
          </Pressable>
        </>
      )}
      {feedback !== '' && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md, gap: SPACING.sm },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  label: { color: COLORS.primary, fontWeight: '600' },
  help: { color: COLORS.textSecondary },
  feedback: { color: COLORS.textPrimary },
  disabled: { opacity: 0.5 },
});
