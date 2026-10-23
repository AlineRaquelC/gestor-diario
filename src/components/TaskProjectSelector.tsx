import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

type Option = { id: string; name: string; icon?: string };
// Presentation only: the caller keeps ownership of the selected real ID.
export default function TaskProjectSelector({
  projects,
  selectedId,
  onSelect,
}: {
  projects: readonly Option[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selected = projects.find(project => project.id === selectedId);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Selecionar projeto: ${
          selected?.name ?? 'Selecionar projeto'
        }`}
        accessibilityHint="Abre a lista de projetos"
        style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        onPress={() => setVisible(true)}
      >
        {selected?.icon ? (
          <Text style={styles.icon}>{selected.icon}</Text>
        ) : null}
        <Text style={styles.name}>
          {selected?.name ?? 'Selecionar projeto'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Projeto
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.cancel}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.link}>Cancelar</Text>
            </Pressable>
          </View>
          <FlatList
            data={projects}
            keyExtractor={project => project.id}
            extraData={selectedId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Projeto: ${item.name}`}
                accessibilityState={{ selected: item.id === selectedId }}
                style={({ pressed }) => [
                  styles.selector,
                  item.id === selectedId && styles.selected,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  onSelect(item.id);
                  setVisible(false);
                }}
              >
                {item.icon ? (
                  <Text style={styles.icon}>{item.icon}</Text>
                ) : null}
                <Text style={styles.name}>{item.name}</Text>
                {item.id === selectedId && <Text style={styles.link}>✓</Text>}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  cancel: {
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  link: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  selector: {
    minHeight: 48,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  pressed: { opacity: 0.7 },
  icon: { fontSize: 20 },
  name: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  chevron: { fontSize: 22, color: COLORS.primary },
});
