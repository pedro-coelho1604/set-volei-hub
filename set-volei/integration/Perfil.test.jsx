/**
 * Integration test — Perfil (tabs) screen.
 *
 * Renders the real Perfil screen. Validates:
 *   - the loaded user data populates the name field
 *   - editing a field reveals the floating "Salvar" button and saving
 *     triggers the success Alert (spied in jest.setup.js)
 *   - logging out clears the session and navigates back to the login screen
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import Perfil from '../src/app/(tabs)/perfil'
import { getStoredUser } from '../src/app/auth/storage/authStorage'

describe('Perfil (integration)', () => {
  it('loads the user data into the form', async () => {
    render(<Perfil />)

    const nameInput = await screen.findByTestId('perfil-name-input')
    expect(nameInput.props.value).toBe('Pedro Coelho')
  })

  it('shows the save button after editing and confirms the save with an Alert', async () => {
    render(<Perfil />)
    const nameInput = await screen.findByTestId('perfil-name-input')

    // The save button is hidden until something is edited.
    expect(screen.queryByTestId('perfil-save-button')).toBeNull()

    fireEvent.changeText(nameInput, 'Pedro Atualizado')

    const saveButton = await screen.findByTestId('perfil-save-button')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Salvo', 'Perfil atualizado com sucesso.')
    })

    // The edited user is persisted.
    const stored = await getStoredUser()
    expect(stored.name).toBe('Pedro Atualizado')
  })

  it('logs out and returns to the login screen', async () => {
    render(<Perfil />)
    await screen.findByTestId('perfil-name-input')

    fireEvent.press(screen.getByTestId('perfil-logout-button'))

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/auth/screens/LoginScreen')
    })
    expect(await getStoredUser()).toBeNull()
  })
})
