import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { parseStructuredQr } from '../domain/structuredQr';
import type { ExternalTaskDraft } from '../models/externalTaskDraft';
import { qrScanner, requestQrCameraPermission } from '../services/qrScanner';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function TaskQrImport({
  disabled,
  onDraft,
  onBusyChange,
}: {
  disabled: boolean;
  onDraft: (draft: ExternalTaskDraft) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const navigation = useNavigation();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const locked = useRef(false);
  const generation = useRef(0);
  const callbacks = useRef({ onDraft, onBusyChange });
  callbacks.current = { onDraft, onBusyChange };

  useEffect(() => {
    function cancelPending() {
      generation.current++;
      locked.current = false;
      qrScanner.cancel();
    }
    function invalidate() {
      cancelPending();
      setBusy(false);
      callbacks.current.onBusyChange(false);
    }
    // AppState background while opening our native Activity is expected. The
    // scanner Activity owns its onPause/focus cleanup; route blur still cancels.
    const unsubscribe = navigation.addListener?.('blur', invalidate);
    return () => {
      unsubscribe?.();
      cancelPending();
    };
  }, [navigation]);

  async function scan() {
    if (locked.current || disabled) {
      return;
    }
    locked.current = true;
    const token = ++generation.current;
    const current = () => token === generation.current;
    const finish = () => {
      if (!current()) {
        return;
      }
      locked.current = false;
      setBusy(false);
      callbacks.current.onBusyChange(false);
    };
    setBusy(true);
    callbacks.current.onBusyChange(true);
    setFeedback('');
    let confirming = false;
    try {
      const permission = await requestQrCameraPermission();
      if (!current()) {
        return;
      }
      if (permission !== 'granted') {
        const message =
          permission === 'blocked'
            ? 'A câmera está bloqueada para este app. Você pode continuar digitando ou abrir as Configurações.'
            : permission === 'denied'
            ? 'A câmera não foi autorizada. Você pode continuar criando a tarefa manualmente.'
            : 'A câmera não está disponível neste aparelho. Você pode digitar a tarefa.';
        setFeedback(message);
        Alert.alert(
          'Câmera',
          message,
          permission === 'blocked'
            ? [
                { text: 'Continuar digitando', style: 'cancel' },
                {
                  text: 'Abrir configurações',
                  onPress: () => {
                    Linking.openSettings().catch(() =>
                      Alert.alert(
                        'Câmera',
                        'Não foi possível abrir as Configurações.',
                      ),
                    );
                  },
                },
              ]
            : [{ text: 'OK' }],
        );
        return;
      }
      if (
        AppState.currentState === 'background' ||
        AppState.currentState === 'inactive'
      ) {
        return;
      }
      const result = await qrScanner.scan();
      if (!current() || result.kind === 'cancelled') {
        return;
      }
      const parsed = parseStructuredQr(result.payload);
      // Raw payload is never put in component state, storage, logs or navigation.
      if (!parsed.ok) {
        setFeedback(parsed.message);
        Alert.alert('QR Code não compatível', parsed.message);
        return;
      }
      const draft = parsed.draft;
      confirming = true;
      const message = [
        `Título: ${draft.title}`,
        'Os campos válidos informados no QR substituirão os campos correspondentes do formulário. Projeto, horário, lembretes e subtarefas serão preservados.',
        ...draft.warnings,
        'Depois, revise e edite os dados. A tarefa só será criada ao tocar em Criar tarefa.',
      ].join('\n\n');
      Alert.alert(
        'Usar dados do QR Code?',
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: finish },
          {
            text: 'Usar dados',
            onPress: () => {
              if (current()) {
                callbacks.current.onDraft(draft);
                setFeedback(
                  [
                    'QR Code lido. Revise os campos antes de criar a tarefa.',
                    ...draft.warnings,
                  ].join('\n'),
                );
              }
              finish();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      if (current()) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível ler o QR Code. Tente novamente ou digite a tarefa.';
        setFeedback(message);
        Alert.alert('Leitura de QR Code', message);
      }
    } finally {
      if (!confirming) {
        finish();
      }
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Escanear QR Code"
        accessibilityHint="Abre a câmera para preencher um rascunho revisável, sem criar a tarefa"
        accessibilityState={{ disabled: disabled || busy, busy }}
        disabled={disabled || busy}
        onPress={scan}
        style={[styles.button, (disabled || busy) && styles.disabled]}
      >
        <Text style={styles.label}>
          {busy ? 'Leitura de QR em andamento…' : 'Escanear QR Code'}
        </Text>
      </Pressable>
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  disabled: { opacity: 0.5 },
  label: { color: COLORS.primary, fontWeight: '600' },
  feedback: { color: COLORS.textPrimary, marginTop: SPACING.sm },
});
