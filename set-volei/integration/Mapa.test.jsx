/**
 * Integration test — Mapa (tabs) screen.
 *
 * Renders the real Mapa screen with `react-native-maps` and `expo-location`
 * mocked (jest.setup.js). Location permission defaults to "denied", so the
 * screen renders the map with the four club units. Tapping a unit marker
 * opens the info card; closing it removes the card.
 */
import { render, screen, fireEvent } from '@testing-library/react-native'
import Mapa from '../src/app/(tabs)/mapa'

describe('Mapa (integration)', () => {
  it('renders the four unit markers after loading', async () => {
    render(<Mapa />)

    // Initially the screen shows a loading spinner; wait for the markers.
    expect(await screen.findByTestId('map-marker-1')).toBeTruthy()
    expect(screen.getByTestId('map-marker-2')).toBeTruthy()
    expect(screen.getByTestId('map-marker-3')).toBeTruthy()
    expect(screen.getByTestId('map-marker-4')).toBeTruthy()
  })

  it('opens the info card for a selected unit and closes it', async () => {
    render(<Mapa />)

    const marker = await screen.findByTestId('map-marker-2')
    fireEvent.press(marker)

    // Card for "Barra do Piraí" (unit id 2) is shown.
    expect(screen.getByTestId('map-unit-card')).toBeTruthy()
    expect(screen.getByText('Barra do Piraí')).toBeTruthy()

    fireEvent.press(screen.getByTestId('map-card-close'))

    expect(screen.queryByTestId('map-unit-card')).toBeNull()
  })
})
