import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RECURRENCE_OPTIONS } from '../models/recurrence';
import type { RecurrenceFrequency } from '../models/recurrence';
import { COLORS, RADIUS, SPACING } from '../styles/theme';
export default function RecurrenceFrequencySelector({
  value,
  onChange,
  disabled = false,
}: {
  value: RecurrenceFrequency;
  onChange: (value: RecurrenceFrequency) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.options}>
      {RECURRENCE_OPTIONS.map(option => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ checked: value === option.value, disabled }}
          disabled={disabled}
          style={[styles.button, value === option.value && styles.selected]}
          onPress={() => onChange(option.value)}
        >
          <Text style={styles.text}>
            {value === option.value ? '✓ ' : ''}
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  text: { color: COLORS.textPrimary },
});
