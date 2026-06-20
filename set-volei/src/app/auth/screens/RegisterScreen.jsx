import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { login, register } from '../../../storage/authStorage'

const POSITIONS = [
  { label: 'Levantador', value: 'levantador' },
  { label: 'Libero', value: 'libero' },
  { label: 'Ponteiro', value: 'ponteiro' },
  { label: 'Oposto', value: 'oposto' },
  { label: 'Central', value: 'central' },
]

function formatDate(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export default function RegisterScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [shirtNumber, setShirtNumber] = useState('')
  const [position, setPosition] = useState('levantador')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!name || !email || !password || !birthDate || !shirtNumber || !height || !weight) {
      setError('Preencha todos os campos.')
      return
    }

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (!profilePhoto) {
      setError('Escolha uma foto de perfil pela galeria ou camera.')
      return
    }

    setError('')
    setLoading(true)

    const result = await register({
      name,
      email,
      password,
      birthDate,
      shirtNumber,
      position,
      height,
      weight,
      profilePhoto,
    })

    if (result.success) {
      const loginResult = await login(email, password)
      setLoading(false)

      if (loginResult.success) {
        router.replace('/(tabs)/')
      } else {
        router.replace('/auth/screens/LoginScreen')
      }
      return
    }

    setLoading(false)
    setError(result.error)
  }

  function applyPhoto(result) {
    if (!result.canceled && result.assets?.[0]) {
      setProfilePhoto(result.assets[0])
      setError('')
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Permita o acesso a galeria para escolher sua foto.')
      return
    }

    applyPhoto(await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    }))
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setError('Permita o acesso a camera para tirar sua foto.')
      return
    }

    applyPhoto(await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    }))
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.title}>Set Volei</Text>
          <Text style={styles.subtitle}>Crie sua conta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.photoSection}>
            <View style={styles.photoPreview}>
              {profilePhoto ? (
                <Image
                  testID="register-photo-preview"
                  source={{ uri: profilePhoto.uri }}
                  style={styles.photoImage}
                />
              ) : (
                <Ionicons name="person" size={42} color="#666" />
              )}
            </View>
            <Text style={styles.photoLabel}>Foto de perfil</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                testID="register-gallery-button"
                style={styles.photoButton}
                onPress={pickFromGallery}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto da galeria"
              >
                <Ionicons name="images-outline" size={20} color="#FFD600" />
                <Text style={styles.photoButtonText}>Galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="register-camera-button"
                style={styles.photoButton}
                onPress={takePhoto}
                accessibilityRole="button"
                accessibilityLabel="Tirar foto com a camera"
              >
                <Ionicons name="camera-outline" size={20} color="#FFD600" />
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Field
            testID="register-name-input"
            placeholder="Nome completo"
            value={name}
            onChangeText={setName}
          />
          <Field
            testID="register-email-input"
            placeholder="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            testID="register-password-input"
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Field
            testID="register-birth-date-input"
            placeholder="Data de nascimento (DD/MM/AAAA)"
            keyboardType="numeric"
            maxLength={10}
            value={birthDate}
            onChangeText={(value) => setBirthDate(formatDate(value))}
          />
          <View style={styles.row}>
            <Field
              testID="register-shirt-number-input"
              placeholder="Camisa"
              keyboardType="numeric"
              value={shirtNumber}
              onChangeText={setShirtNumber}
              style={styles.rowInput}
            />
            <Field
              testID="register-height-input"
              placeholder="Altura"
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
              style={styles.rowInput}
            />
            <Field
              testID="register-weight-input"
              placeholder="Peso"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              style={styles.rowInput}
            />
          </View>

          <View style={styles.positionGrid}>
            {POSITIONS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.positionChip, position === item.value && styles.positionChipActive]}
                onPress={() => setPosition(item.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: position === item.value }}
              >
                <Text style={[styles.positionText, position === item.value && styles.positionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <Text testID="register-error" style={styles.error}>{error}</Text>
          ) : null}

          <TouchableOpacity
            testID="register-submit-button"
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar"
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="register-login-link"
            onPress={() => router.replace('/auth/screens/LoginScreen')}
            disabled={loading}
          >
            <Text style={styles.linkText}>Ja tenho conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ style, ...props }) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#555"
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 28,
  },
  logoArea: {
    alignItems: 'center',
    gap: 8,
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
  photoSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#FFD600',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    minWidth: 112,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowInput: {
    flex: 1,
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
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionChip: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  positionChipActive: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
  },
  positionText: {
    color: '#aaa',
    fontSize: 13,
  },
  positionTextActive: {
    color: '#000',
    fontWeight: 'bold',
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
  linkText: {
    color: '#FFD600',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
})
