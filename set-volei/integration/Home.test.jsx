/**
 * Integration test — Home (tabs) screen.
 *
 * Renders the real Home screen wired to the real check-in storage. It loads
 * the fallback `userMock`, then performs a check-in on today's training day
 * through the day modal and asserts the storage was updated.
 *
 * Only AsyncStorage / expo-router / native modules are mocked (jest.setup.js).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Home from '../src/app/(tabs)/index'
import { getCheckins } from '../src/app/home/storage/checkinStorage'

// Same date key the screen uses internally (UTC `toISOString` split).
const todayStr = new Date().toISOString().split('T')[0]

describe('Home (integration)', () => {
  it('greets the logged user and renders the weekly training section', async () => {
    render(<Home />)

    // `userMock.name` is "Pedro Coelho" -> greeting shows the first name.
    expect(await screen.findByText(/Olá, Pedro/)).toBeTruthy()
    expect(screen.getByText('Treinos da semana')).toBeTruthy()
  })

  it('checks in on today and persists the presence', async () => {
    render(<Home />)
    await screen.findByText(/Olá, Pedro/)

    // Open today's day modal (today is always a training day, see getTrainingDays).
    fireEvent.press(screen.getByTestId('home-day-today'))

    // The check-in button is only shown for today with no status yet.
    const checkinButton = await screen.findByTestId('home-checkin-button')
    fireEvent.press(checkinButton)

    await waitFor(async () => {
      const checkins = await getCheckins()
      expect(checkins[todayStr]).toBe('present')
    })
  })
})
