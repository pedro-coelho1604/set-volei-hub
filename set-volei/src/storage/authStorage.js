import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { userMock } from '../mocks/userMocks'

const API_BASE_URL = 'https://set-volei-hub-api.onrender.com'
const LOGIN_URL = `${API_BASE_URL}/auth/login`
const REGISTER_URL = `${API_BASE_URL}/auth/register`
const ME_URL = `${API_BASE_URL}/auth/me`

const AUTH_KEY = '@set_volei:user'
const TOKEN_KEY = '@set_volei:token'
const SECURE_TOKEN_KEY = 'set_volei_token'

function positionFromApi(position) {
  const labels = {
    libero: 'Libero',
    ponteiro: 'Ponteiro',
    oposto: 'Oposto',
    levantador: 'Levantador',
    central: 'Central',
  }

  return labels[position] ?? position ?? ''
}

function positionToApi(position) {
  const normalized = String(position ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const positions = ['libero', 'ponteiro', 'oposto', 'levantador', 'central']
  return positions.includes(normalized) ? normalized : 'ponteiro'
}

function dateFromApi(date) {
  if (!date) return ''

  const [year, month, day] = String(date).split('-')
  return year && month && day ? `${day}/${month}/${year}` : String(date)
}

function dateToApi(date) {
  const value = String(date ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const [day, month, year] = value.split('/')
  if (day && month && year) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

  return value
}

function heightFromApi(heightCm) {
  if (!heightCm) return ''

  return (Number(heightCm) / 100).toFixed(2).replace('.', ',')
}

function heightToApi(height) {
  const value = String(height ?? '').replace(',', '.')
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) return 170
  return numeric > 3 ? Math.round(numeric) : Math.round(numeric * 100)
}

function mapUserFromApi(user) {
  return {
    ...userMock,
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.profile_photo_url ?? '',
    profile_photo_url: user.profile_photo_url ?? null,
    birth_date: user.birth_date,
    shirt_number: user.shirt_number,
    position: user.position,
    height_cm: user.height_cm,
    weight_kg: user.weight_kg,
    nascimento: dateFromApi(user.birth_date),
    numero: String(user.shirt_number ?? ''),
    posicao: positionFromApi(user.position),
    altura: heightFromApi(user.height_cm),
    peso: String(user.weight_kg ?? ''),
  }
}

function registerPayload(data) {
  return {
    name: data.name,
    email: data.email,
    password: data.password,
    birth_date: dateToApi(data.birthDate ?? data.nascimento),
    shirt_number: Number(data.shirtNumber ?? data.numero),
    position: positionToApi(data.position ?? data.posicao),
    height_cm: heightToApi(data.height ?? data.altura),
    weight_kg: Number(String(data.weight ?? data.peso).replace(',', '.')),
  }
}

function updatePayload(data) {
  const payload = {}

  if (data.name !== undefined) payload.name = data.name
  if (data.birthDate !== undefined || data.nascimento !== undefined) {
    payload.birth_date = dateToApi(data.birthDate ?? data.nascimento)
  }
  if (data.shirtNumber !== undefined || data.numero !== undefined) {
    payload.shirt_number = Number(data.shirtNumber ?? data.numero)
  }
  if (data.position !== undefined || data.posicao !== undefined) {
    payload.position = positionToApi(data.position ?? data.posicao)
  }
  if (data.height !== undefined || data.altura !== undefined) {
    payload.height_cm = heightToApi(data.height ?? data.altura)
  }
  if (data.weight !== undefined || data.peso !== undefined) {
    payload.weight_kg = Number(String(data.weight ?? data.peso).replace(',', '.'))
  }
  if (data.profile_photo_url !== undefined) {
    payload.profile_photo_url = data.profile_photo_url
  }

  return payload
}

function errorMessageFromBody(body, fallback) {
  if (!body) return fallback
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  if (body.message) return body.message
  if (body.error) return body.error

  return fallback
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessageFromBody(body, 'Nao foi possivel concluir a solicitacao.'))
  }

  return body
}

async function saveToken(token) {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
    AsyncStorage.setItem(TOKEN_KEY, token),
  ])
}

async function getSavedToken() {
  const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY)
  if (secureToken) return secureToken

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY)
  if (legacyToken) {
    await saveToken(legacyToken)
    return legacyToken
  }

  return null
}

async function getBiometricAvailability() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])

  return hasHardware && isEnrolled
}

async function fetchUserWithToken(token) {
  const apiUser = await request(ME_URL, {
    headers: { Authorization: `bearer ${token}` },
  })
  const user = mapUserFromApi(apiUser)

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return user
}

export async function login(email, password) {
  try {
    const token = await request(LOGIN_URL, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    await saveToken(token.access_token)
    const user = await fetchUserWithToken(token.access_token)

    return { success: true, user, token: token.access_token }
  } catch (error) {
    return { success: false, error: error.message || 'E-mail ou senha invalidos.' }
  }
}

export async function register(data) {
  try {
    const user = await request(REGISTER_URL, {
      method: 'POST',
      body: JSON.stringify(registerPayload(data)),
    })

    return { success: true, user: mapUserFromApi(user) }
  } catch (error) {
    return { success: false, error: error.message || 'Nao foi possivel criar sua conta.' }
  }
}

export async function updateCurrentUser(data) {
  try {
    const token = await getSavedToken()
    if (!token) {
      return { success: false, error: 'Sessao expirada. Entre novamente.' }
    }

    const apiUser = await request(ME_URL, {
      method: 'PUT',
      headers: { Authorization: `bearer ${token}` },
      body: JSON.stringify(updatePayload(data)),
    })
    const user = mapUserFromApi(apiUser)

    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
    return { success: true, user }
  } catch (error) {
    return { success: false, error: error.message || 'Nao foi possivel atualizar seu perfil.' }
  }
}

export async function canUseBiometricLogin() {
  const token = await getSavedToken()
  if (!token) return false

  return getBiometricAvailability()
}

export async function loginWithBiometrics() {
  try {
    const token = await getSavedToken()
    if (!token) {
      return { success: false, error: 'Entre com e-mail e senha uma vez antes de usar biometria.' }
    }

    const available = await getBiometricAvailability()
    if (!available) {
      return { success: false, error: 'Face ID ou Touch ID nao esta disponivel neste aparelho.' }
    }

    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar no Set Volei',
      fallbackLabel: 'Usar codigo do aparelho',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    })

    if (!auth.success) {
      return { success: false, error: 'Autenticacao cancelada.' }
    }

    const user = await fetchUserWithToken(token)
    return { success: true, user, token }
  } catch (error) {
    return { success: false, error: error.message || 'Nao foi possivel entrar com biometria.' }
  }
}

export async function fetchCurrentUser() {
  try {
    const token = await getSavedToken()
    if (!token) return null

    return fetchUserWithToken(token)
  } catch {
    return getStoredUser()
  }
}

export async function logout() {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_KEY),
    AsyncStorage.removeItem(TOKEN_KEY),
    SecureStore.deleteItemAsync(SECURE_TOKEN_KEY),
  ])
}

export async function getStoredUser() {
  const data = await AsyncStorage.getItem(AUTH_KEY)
  return data ? JSON.parse(data) : null
}
