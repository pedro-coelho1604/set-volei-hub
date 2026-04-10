import AsyncStorage from '@react-native-async-storage/async-storage'
import { userMock } from '../../../mocks/userMocks'

const AUTH_KEY = '@set_volei:user'
const USERS_KEY = '@set_volei:users'

async function seedMock() {
  const raw = await AsyncStorage.getItem(USERS_KEY)
  const users = raw ? JSON.parse(raw) : []
  const exists = users.find(u => u.email === userMock.email)
  if (!exists) {
    users.push(userMock)
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users))
  }
}

export async function login(email, password) {
  await seedMock()
  const raw = await AsyncStorage.getItem(USERS_KEY)
  const users = raw ? JSON.parse(raw) : []
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )
  if (user) {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
    return { success: true, user }
  }
  return { success: false, error: 'E-mail ou senha inválidos.' }
}

export async function logout() {
  await AsyncStorage.removeItem(AUTH_KEY)
}

export async function getStoredUser() {
  const data = await AsyncStorage.getItem(AUTH_KEY)
  return data ? JSON.parse(data) : null
}
