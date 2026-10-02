import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';

export default function NewTaskScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Tarefa</Text>

      <Pressable
        style={styles.button}
        onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E1B3A',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#5C4DFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});