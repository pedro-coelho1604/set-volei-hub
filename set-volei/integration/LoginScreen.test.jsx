/**
 * Integration test — Login screen.
 *
 * Exercises the real LoginScreen wired to the real authStorage module,
 * with only AsyncStorage and expo-router mocked (see jest.setup.js).
 *
 * Flows covered:
 *   - empty fields -> inline validation error
 *   - wrong credentials -> error coming from authStorage
 *   - valid credentials -> navigates to the tabs home
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import LoginScreen from '../src/app/auth/screens/LoginScreen'
import { userMock } from '../src/mocks/userMocks'

describe('LoginScreen (integration)', () => {
  it('shows a validation error when fields are empty', () => {
    render(<LoginScreen />)

    fireEvent.press(screen.getByTestId('login-submit-button'))

    expect(screen.getByTestId('login-error')).toHaveTextContent('Preencha todos os campos.')
    expect(useRouter().replace).not.toHaveBeenCalled()
  })

  it('shows an error for invalid credentials', async () => {
    render(<LoginScreen />)

    fireEvent.changeText(screen.getByTestId('login-email-input'), userMock.email)
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'senha-errada')
    fireEvent.press(screen.getByTestId('login-submit-button'))

    const error = await screen.findByTestId('login-error')
    expect(error).toHaveTextContent(/inválidos/i)
    expect(useRouter().replace).not.toHaveBeenCalled()
  })

  it('logs in with valid credentials and navigates to the home tabs', async () => {
    render(<LoginScreen />)

    fireEvent.changeText(screen.getByTestId('login-email-input'), userMock.email)
    fireEvent.changeText(screen.getByTestId('login-password-input'), userMock.password)
    fireEvent.press(screen.getByTestId('login-submit-button'))

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/(tabs)/')
    })
  })
})
