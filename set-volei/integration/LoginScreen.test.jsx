/**
 * Integration test - Login screen.
 *
 * Exercises the real LoginScreen wired to the real authStorage module,
 * with only network, AsyncStorage and expo-router mocked (see jest.setup.js).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import LoginScreen from '../src/app/auth/screens/LoginScreen'
import { userMock } from '../src/mocks/userMocks'

function jsonResponse(body, ok = true) {
  return {
    ok,
    text: jest.fn(async () => JSON.stringify(body)),
  }
}

describe('LoginScreen (integration)', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('shows a validation error when fields are empty', () => {
    render(<LoginScreen />)

    fireEvent.press(screen.getByTestId('login-submit-button'))

    expect(screen.getByTestId('login-error')).toHaveTextContent('Preencha todos os campos.')
    expect(useRouter().replace).not.toHaveBeenCalled()
  })

  it('shows an error for invalid credentials', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'E-mail ou senha invalidos.' }, false))

    render(<LoginScreen />)

    fireEvent.changeText(screen.getByTestId('login-email-input'), userMock.email)
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'senha-errada')
    fireEvent.press(screen.getByTestId('login-submit-button'))

    const error = await screen.findByTestId('login-error')
    expect(error).toHaveTextContent(/invalidos/i)
    expect(useRouter().replace).not.toHaveBeenCalled()
  })

  it('logs in with valid credentials and navigates to the home tabs', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: 'abc123', token_type: 'bearer' }))
      .mockResolvedValueOnce(jsonResponse({
        id: 1,
        name: userMock.name,
        email: userMock.email,
        birth_date: '2000-03-15',
        shirt_number: 10,
        position: 'levantador',
        height_cm: 185,
        weight_kg: '78',
        created_at: '2026-06-18T12:00:00',
      }))

    render(<LoginScreen />)

    fireEvent.changeText(screen.getByTestId('login-email-input'), userMock.email)
    fireEvent.changeText(screen.getByTestId('login-password-input'), '12345678')
    fireEvent.press(screen.getByTestId('login-submit-button'))

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/(tabs)/')
    })
  })
})
