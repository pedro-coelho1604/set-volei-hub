/**
 * Unit tests — authentication storage layer.
 *
 * Covers the contract of `src/app/auth/storage/authStorage.js`:
 *   - login() validates credentials against the seeded mock user
 *   - a successful login persists the session under the AUTH key
 *   - logout() clears the session
 *   - getStoredUser() reflects the current session
 *
 * AsyncStorage is mocked globally in jest.setup.js (in-memory + auto-cleared).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { login, logout, getStoredUser } from '../src/app/auth/storage/authStorage'
import { userMock } from '../src/mocks/userMocks'

const AUTH_KEY = '@set_volei:user'

describe('authStorage', () => {
  it('returns no stored user before any login', async () => {
    await expect(getStoredUser()).resolves.toBeNull()
  })

  it('logs in with the seeded mock credentials and persists the session', async () => {
    const result = await login(userMock.email, userMock.password)

    expect(result.success).toBe(true)
    expect(result.user.email).toBe(userMock.email)

    // Session is persisted under the auth key.
    const raw = await AsyncStorage.getItem(AUTH_KEY)
    expect(JSON.parse(raw).email).toBe(userMock.email)

    // ...and is readable through the public helper.
    const stored = await getStoredUser()
    expect(stored.name).toBe(userMock.name)
  })

  it('is case-insensitive on the e-mail', async () => {
    const result = await login(userMock.email.toUpperCase(), userMock.password)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid password without creating a session', async () => {
    const result = await login(userMock.email, 'senha-errada')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/inválidos/i)
    await expect(getStoredUser()).resolves.toBeNull()
  })

  it('clears the session on logout', async () => {
    await login(userMock.email, userMock.password)
    expect(await getStoredUser()).not.toBeNull()

    await logout()

    await expect(getStoredUser()).resolves.toBeNull()
  })
})
