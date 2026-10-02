import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import {useProjects} from '../context/ProjectContext';

const COLORS = [
  '#5C4DFF',
  '#F43F5E',
  '#F59E0B',
  '#22C55E',
  '#06B6D4',
  '#8B5CF6',
  '#64748B',
];

const ICONS = [
  '📁',
  '🏠',
  '💼',
  '🎓',
  '💻',
  '📣',
  '📦',
  '💰',
  '👥',
  '📚',
  '🎯',
  '⭐',
  '❤️',
  '✈️',
  '🛒',
  '🏋️',
];

export default function CreateProjectScreen() {
  const navigation = useNavigation<any>();
  const {addProject} = useProjects();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5C4DFF');
  const [icon, setIcon] = useState('📁');

  const canSubmit =
    name.trim().length > 0;

  function handleCreate() {
    if (!canSubmit) {
      return;
    }

    addProject({
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    });

    Alert.alert(
      'Projeto criado',
      'O projeto foi criado com sucesso.',
      [
        {
          text: 'OK',
          onPress: () =>
            navigation.goBack(),
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F9FD"
      />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }>
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Novo Projeto
        </Text>

        <View style={{width: 38}} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.field}>
          <Text style={styles.label}>
            Nome do projeto
            <Text style={styles.required}>
              {' '}*
            </Text>
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Faculdade"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Descrição
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o objetivo do projeto..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Ícone */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Ícone do projeto
          </Text>

          <View style={styles.iconGrid}>
            {ICONS.map(item => {
              const active =
                icon === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.iconOption,
                    active &&
                      styles.iconOptionActive,
                  ]}
                  onPress={() =>
                    setIcon(item)
                  }>

                  <Text style={styles.iconEmoji}>
                    {item}
                  </Text>

                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Cor do projeto
          </Text>

          <View style={styles.colorGrid}>
            {COLORS.map(item => {
              const active =
                color === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                    },
                    active &&
                      styles.colorOptionActive,
                  ]}
                  onPress={() =>
                    setColor(item)
                  }>

                  {active && (
                    <Text style={styles.colorCheck}>
                      ✓
                    </Text>
                  )}

                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>
            PRÉ-VISUALIZAÇÃO
          </Text>

          <View style={styles.previewContent}>
            <View
              style={[
                styles.previewIcon,
                {
                  backgroundColor:
                    color + '22',
                },
              ]}>

              <Text style={styles.previewEmoji}>
                {icon}
              </Text>

            </View>

            <View style={styles.previewTextArea}>
              <Text style={styles.previewName}>
                {name.trim()
                  ? name
                  : 'Nome do projeto'}
              </Text>

              <Text style={styles.previewDescription}>
                {description.trim()
                  ? description
                  : 'Descrição do projeto'}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: color,
                  width: '35%',
                },
              ]}
            />
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cancelButton}
          onPress={() =>
            navigation.goBack()
          }>
          <Text style={styles.cancelText}>
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          disabled={!canSubmit}
          style={[
            styles.createButton,
            !canSubmit &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreate}>

          <Text
            style={[
              styles.createText,
              !canSubmit &&
                styles.createTextDisabled,
            ]}>
            Criar projeto
          </Text>

        </Pressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },

  scroll: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 31,
    color: '#1E1B3A',
    marginTop: -4,
  },

  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  field: {
    marginBottom: 22,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  required: {
    color: '#F43F5E',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#1E1B3A',
    fontSize: 15,
  },

  textArea: {
    minHeight: 105,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  iconOption: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconOptionActive: {
    borderColor: '#5C4DFF',
    backgroundColor: '#EEF0FF',
  },

  iconEmoji: {
    fontSize: 22,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  colorOption: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
  },

  colorCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    elevation: 2,
  },

  previewLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 14,
  },

  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  previewEmoji: {
    fontSize: 21,
  },

  previewTextArea: {
    flex: 1,
  },

  previewName: {
    color: '#1E1B3A',
    fontSize: 16,
    fontWeight: '700',
  },

  previewDescription: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },

  progressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginTop: 16,
    overflow: 'hidden',
  },

  progressBar: {
    height: 5,
    borderRadius: 5,
  },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },

  cancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },

  createButton: {
    flex: 2,
    backgroundColor: '#5C4DFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },

  createButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },

  createText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  createTextDisabled: {
    color: '#94A3B8',
  },
});