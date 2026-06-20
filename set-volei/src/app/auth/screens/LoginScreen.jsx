import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { canUseBiometricLogin, login, loginWithBiometrics } from '../../../storage/authStorage'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    let active = true

    async function checkBiometrics() {
      const available = await canUseBiometricLogin()
      if (active && available) setBiometricAvailable(true)
    }

    checkBiometrics()
    return () => { active = false }
  }, [])

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      router.replace('/(tabs)/')
    } else {
      setError(result.error)
    }
  }

  async function handleBiometricLogin() {
    setError('')
    setLoading(true)
    const result = await loginWithBiometrics()
    setLoading(false)

    if (result.success) {
      router.replace('/(tabs)/')
    } else {
      setError(result.error)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        <View style={styles.logoArea}>
          <Text style={styles.title}>Set Vôlei</Text>
          <Text style={styles.subtitle}>Acesse sua conta</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            testID="login-email-input"
            accessibilityLabel="Campo de e-mail"
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            testID="login-password-input"
            accessibilityLabel="Campo de senha"
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#555"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <Text testID="login-error" style={styles.error}>{error}</Text>
          ) : null}

          <TouchableOpacity
            testID="login-submit-button"
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable ? (
            <TouchableOpacity
              testID="login-biometric-button"
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Entrar com Face ID ou Touch ID"
            >
              <Text style={styles.biometricButtonText}>Entrar com Face ID / Touch ID</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            testID="login-register-link"
            onPress={() => router.replace('/auth/screens/RegisterScreen')}
            disabled={loading}
          >
            <Text style={styles.linkText}>Criar conta</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 28,
  },
  logoArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFD600',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  error: {
    color: '#ff4d4d',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFD600',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: '#FFD600',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 15,
  },
  linkText: {
    color: '#FFD600',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
})
