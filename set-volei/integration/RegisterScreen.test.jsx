import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import RegisterScreen from '../src/app/auth/screens/RegisterScreen'

describe('RegisterScreen (integration)', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('requires a profile photo before creating the account', () => {
    render(<RegisterScreen />)

    fireEvent.changeText(screen.getByTestId('register-name-input'), 'Maria Silva')
    fireEvent.changeText(screen.getByTestId('register-email-input'), 'maria@example.com')
    fireEvent.changeText(screen.getByTestId('register-password-input'), '12345678')
    fireEvent.changeText(screen.getByTestId('register-birth-date-input'), '15032000')
    fireEvent.changeText(screen.getByTestId('register-shirt-number-input'), '7')
    fireEvent.changeText(screen.getByTestId('register-height-input'), '1,75')
    fireEvent.changeText(screen.getByTestId('register-weight-input'), '65')
    fireEvent.press(screen.getByTestId('register-submit-button'))

    expect(screen.getByTestId('register-error')).toHaveTextContent(/escolha uma foto/i)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows the selected gallery photo in the registration form', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///profile.jpg', fileName: 'profile.jpg', mimeType: 'image/jpeg' }],
    })

    render(<RegisterScreen />)
    fireEvent.press(screen.getByTestId('register-gallery-button'))

    await waitFor(() => {
      expect(screen.getByTestId('register-photo-preview')).toHaveProp('source', { uri: 'file:///profile.jpg' })
    })
  })

  it('opens the camera and shows the captured photo', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///camera.jpg', fileName: 'camera.jpg', mimeType: 'image/jpeg' }],
    })

    render(<RegisterScreen />)
    fireEvent.press(screen.getByTestId('register-camera-button'))

    await waitFor(() => {
      expect(screen.getByTestId('register-photo-preview')).toHaveProp('source', { uri: 'file:///camera.jpg' })
    })
  })
})
