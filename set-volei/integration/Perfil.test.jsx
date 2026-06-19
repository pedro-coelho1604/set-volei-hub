import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import Perfil from '../src/app/(tabs)/perfil'
import { getStoredUser } from '../src/storage/authStorage'

const SECURE_TOKEN_KEY = 'set_volei_token'

function jsonResponse(body, ok = true) {
  return {
    ok,
    text: jest.fn(async () => JSON.stringify(body)),
  }
}

function apiUser(overrides = {}) {
  return {
    id: 5,
    name: 'Bernardo Duque',
    email: 'beduque@gmail.com',
    birth_date: '2005-04-26',
    shirt_number: 99,
    position: 'libero',
    height_cm: 190,
    weight_kg: '70.00',
    profile_photo_url: 'https://example.com/profile.png',
    created_at: '2026-06-19T21:16:04.850512Z',
    ...overrides,
  }
}

describe('Perfil (integration)', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
  })

  it('loads the logged user data from /auth/me into the form', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser()))

    render(<Perfil />)

    const nameInput = await screen.findByTestId('perfil-name-input')
    expect(nameInput.props.value).toBe('Bernardo Duque')
    expect(screen.queryByText('URL da foto')).toBeNull()
  })

  it('shows the save button after editing and updates the user through the API', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser()))
      .mockResolvedValueOnce(jsonResponse(apiUser({ name: 'Bernardo Atualizado' })))

    render(<Perfil />)
    const nameInput = await screen.findByTestId('perfil-name-input')

    expect(screen.queryByTestId('perfil-save-button')).toBeNull()

    fireEvent.changeText(nameInput, 'Bernardo Atualizado')

    const saveButton = await screen.findByTestId('perfil-save-button')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Salvo', 'Perfil atualizado com sucesso.')
    })

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://set-volei-hub-api.onrender.com/auth/me',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'bearer abc123' }),
        body: expect.stringContaining('Bernardo Atualizado'),
      }),
    )

    const stored = await getStoredUser()
    expect(stored.name).toBe('Bernardo Atualizado')
    expect(stored.avatar).toBe('https://example.com/profile.png')
  })

  it('shows the save button after changing the player position', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser({ position: 'libero' })))

    render(<Perfil />)
    await screen.findByTestId('perfil-name-input')

    expect(screen.queryByTestId('perfil-save-button')).toBeNull()

    fireEvent.press(screen.getByTestId('perfil-position-central'))

    expect(await screen.findByTestId('perfil-save-button')).toBeTruthy()
  })

  it('logs out and returns to the login screen', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(apiUser()))

    render(<Perfil />)
    await screen.findByTestId('perfil-name-input')

    fireEvent.press(screen.getByTestId('perfil-logout-button'))

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/auth/screens/LoginScreen')
    })
    expect(await getStoredUser()).toBeNull()
  })
})
