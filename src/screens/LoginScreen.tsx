import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  function entrar() {
    navigation.replace('Home');
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.logo}>
        <Text style={styles.logoText}>✓</Text>
      </View>

      <Text style={styles.title}>Gestor Diário</Text>
      <Text style={styles.subtitle}>
        Organize seu dia e conclua o que importa.
      </Text>

      <Text style={styles.label}>E-mail</Text>

      <TextInput
        style={styles.input}
        accessibilityLabel="E-mail"
        placeholder="seuemail@email.com"
        placeholderTextColor={COLORS.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Senha</Text>

      <TextInput
        style={styles.input}
        accessibilityLabel="Senha"
        placeholder="Digite sua senha"
        placeholderTextColor={COLORS.textSecondary}
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <Pressable style={styles.forgotButton}>
        <Text style={styles.forgotText}>Esqueci minha senha</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={styles.loginButton}
        onPress={entrar}
      >
        <Text style={styles.loginButtonText}>Entrar</Text>
      </Pressable>

      <Text style={styles.accountText}>Ainda não possui uma conta?</Text>

      <Pressable style={styles.registerButton}>
        <Text style={styles.registerText}>Criar conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.background,
  },

  logo: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },

  logoText: {
    color: COLORS.surface,
    fontSize: 34,
    fontWeight: '700',
  },

  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },

  label: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  input: {
    minHeight: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },

  forgotButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: SPACING.xl,
  },

  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  loginButton: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },

  loginButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },

  accountText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SPACING.xxl,
  },

  registerButton: { minHeight: 44, justifyContent: 'center' },
  registerText: {
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
});
