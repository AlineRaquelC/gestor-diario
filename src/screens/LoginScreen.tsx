import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  function entrar() {
    navigation.replace('Home');
  }

  return (
    <View style={styles.container}>
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
        placeholder="seuemail@email.com"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Senha</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite sua senha"
        placeholderTextColor="#94A3B8"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <Pressable style={styles.forgotButton}>
        <Text style={styles.forgotText}>Esqueci minha senha</Text>
      </Pressable>

      <Pressable style={styles.loginButton} onPress={entrar}>
        <Text style={styles.loginButtonText}>Entrar</Text>
      </Pressable>

      <Text style={styles.accountText}>
        Ainda não possui uma conta?
      </Text>

      <Pressable>
        <Text style={styles.registerText}>Criar conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F8F9FD',
  },

  logo: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#5C4DFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
  },

  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  subtitle: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 7,
    marginBottom: 34,
  },

  label: {
    color: '#1E1B3A',
    fontWeight: '600',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E1B3A',
    marginBottom: 18,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 24,
  },

  forgotText: {
    color: '#5C4DFF',
    fontSize: 13,
    fontWeight: '600',
  },

  loginButton: {
    backgroundColor: '#5C4DFF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  accountText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 28,
  },

  registerText: {
    textAlign: 'center',
    color: '#5C4DFF',
    fontWeight: '700',
    marginTop: 5,
  },
});