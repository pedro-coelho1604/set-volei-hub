import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import {
  canUseBiometricLogin,
  fetchCurrentUser,
  getStoredUser,
  login,
  loginWithBiometrics,
  logout,
  updateCurrentUser,
} from '../src/storage/authStorage'

const AUTH_KEY = '@set_volei:user'
const TOKEN_KEY = '@set_volei:token'
const SECURE_TOKEN_KEY = 'set_volei_token'
const API_BASE_URL = 'https://set-volei-hub-api.onrender.com'
const PROFILE_PHOTO_URL = 'https://example.com/profile.png'

function jsonResponse(body, ok = true) {
  return {
    ok,
    text: jest.fn(async () => JSON.stringify(body)),
  }
}

function apiUser(overrides = {}) {
  return {
    id: 1,
    name: 'Pedro Coelho',
    email: 'pedrocoelho@gmail.com',
    birth_date: '2000-03-15',
    shirt_number: 10,
    position: 'levantador',
    height_cm: 185,
    weight_kg: '78.00',
    profile_photo_url: PROFILE_PHOTO_URL,
    created_at: '2026-06-18T12:00:00',
    ...overrides,
  }
}

describe('authStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('returns no stored user before any login', async () => {
    await expect(getStoredUser()).resolves.toBeNull()
  })

  it('logs in through the production API and persists the session', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: 'abc123', token_type: 'bearer' }))
      .mockResolvedValueOnce(jsonResponse(apiUser()))

    const result = await login('pedrocoelho@gmail.com', '12345678')

    expect(result.success).toBe(true)
    expect(result.user.email).toBe('pedrocoelho@gmail.com')
    expect(result.user.avatar).toBe(PROFILE_PHOTO_URL)
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'pedrocoelho@gmail.com', password: '12345678' }),
      }),
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'bearer abc123' }),
      }),
    )

    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe('abc123')
    await expect(SecureStore.getItemAsync(SECURE_TOKEN_KEY)).resolves.toBe('abc123')

    const raw = await AsyncStorage.getItem(AUTH_KEY)
    expect(JSON.parse(raw).email).toBe('pedrocoelho@gmail.com')

    const stored = await getStoredUser()
    expect(stored.name).toBe('Pedro Coelho')
    expect(stored.numero).toBe('10')
    expect(stored.altura).toBe('1,85')
  })

  it('fetches the logged user from /auth/me with the saved token', async () => {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser({ name: 'Bernardo Duque' })))

    const user = await fetchCurrentUser()

    expect(user.name).toBe('Bernardo Duque')
    expect(user.avatar).toBe(PROFILE_PHOTO_URL)
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'bearer abc123' }),
      }),
    )
  })

  it('does not fall back to a random avatar when the API has no profile photo', async () => {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser({ profile_photo_url: null })))

    const user = await fetchCurrentUser()

    expect(user.profile_photo_url).toBeNull()
    expect(user.avatar).toBe('')
  })

  it('updates the logged user through PUT /auth/me', async () => {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser({ name: 'Bernardo Duque' })))

    const result = await updateCurrentUser({
      name: 'Bernardo Duque',
      nascimento: '26/04/2005',
      numero: '99',
      posicao: 'Libero',
      altura: '1,90',
      peso: '70',
      profile_photo_url: PROFILE_PHOTO_URL,
    })

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/me`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'bearer abc123' }),
        body: JSON.stringify({
          name: 'Bernardo Duque',
          birth_date: '2005-04-26',
          shirt_number: 99,
          position: 'libero',
          height_cm: 190,
          weight_kg: 70,
          profile_photo_url: PROFILE_PHOTO_URL,
        }),
      }),
    )
  })

  it('logs in with biometrics using the saved token', async () => {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true)
    LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true })
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser()))

    await expect(canUseBiometricLogin()).resolves.toBe(true)

    const result = await loginWithBiometrics()

    expect(result.success).toBe(true)
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled()
    expect(result.user.email).toBe('pedrocoelho@gmail.com')
  })

  it('returns the backend error without creating a session', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Invalid credentials' }, false))

    const result = await login('pedrocoelho@gmail.com', 'senha-errada')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid credentials/i)
    await expect(getStoredUser()).resolves.toBeNull()
  })

  it('clears the session and token on logout', async () => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ email: 'user@email.com' }))
    await AsyncStorage.setItem(TOKEN_KEY, 'abc123')
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')

    await logout()

    await expect(getStoredUser()).resolves.toBeNull()
    await expect(AsyncStorage.getItem(TOKEN_KEY)).resolves.toBeNull()
    await expect(SecureStore.getItemAsync(SECURE_TOKEN_KEY)).resolves.toBeNull()
  })
})
