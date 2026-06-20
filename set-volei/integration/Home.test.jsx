import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import * as SecureStore from 'expo-secure-store'
import Home from '../src/app/(tabs)/index'

const SECURE_TOKEN_KEY = 'set_volei_token'
const TODAY_AT_18 = new Date('2026-06-19T18:00:00')
const TODAY_AT_22 = new Date('2026-06-19T22:00:00')
const todayStr = TODAY_AT_18.toISOString().split('T')[0]

function jsonResponse(body, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    text: jest.fn(async () => JSON.stringify(body)),
  }
}

function apiUser(overrides = {}) {
  return {
    id: 5,
    name: 'Pedro Coelho',
    email: 'pedrocoelho@gmail.com',
    birth_date: '2000-03-15',
    shirt_number: 10,
    position: 'levantador',
    height_cm: 185,
    weight_kg: '78.00',
    credito_checkins: 8,
    profile_photo_url: null,
    created_at: '2026-06-19T12:00:00Z',
    ...overrides,
  }
}

describe('Home (integration)', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    jest.setSystemTime(TODAY_AT_18)
    jest.clearAllMocks()
    global.fetch = jest.fn()
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('greets the logged user and renders check-in credits', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 7 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))

    render(<Home />)

    expect(await screen.findByText(/Ola, Pedro/)).toBeTruthy()
    expect(screen.getByText('Voce tem 7 creditos de check-in neste mes.')).toBeTruthy()
    expect(screen.getByText('Treinos da semana')).toBeTruthy()
  })

  it('creates a check-in through the API and updates the day immediately', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 8 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))
      .mockResolvedValueOnce(jsonResponse({
        message: 'Check-in criado',
        credito_checkins: 7,
        checkin: { id: 1, user_id: 5, checkin_date: todayStr, created_at: '2026-06-19T12:00:00Z' },
      }, true))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))

    const checkinButton = await screen.findByTestId('home-checkin-button')
    fireEvent.press(checkinButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://set-volei-hub-api.onrender.com/auth/me/checkins',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    fireEvent.press(screen.getByTestId('home-day-today'))
    expect(await screen.findByTestId('home-cancel-checkin-button')).toBeTruthy()
    expect(screen.getByText('Voce tem 7 creditos de check-in neste mes.')).toBeTruthy()
  })

  it('shows today as checked in when GET /auth/me/checkins returns today', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 7 })))
      .mockResolvedValueOnce(jsonResponse({
        credito_checkins: 7,
        checkins: [{ id: 1, user_id: 5, checkin_date: todayStr, created_at: '2026-06-19T12:00:00Z' }],
      }))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))

    expect(await screen.findByTestId('home-cancel-checkin-button')).toBeTruthy()
    expect(screen.queryByTestId('home-checkin-button')).toBeNull()
  })

  it('queues a check-in offline and confirms it when the connection returns', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 8 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))
      .mockRejectedValueOnce(new TypeError('Network request failed'))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))
    fireEvent.press(await screen.findByTestId('home-checkin-button'))

    expect(await screen.findByTestId('home-pending-checkin-banner')).toBeTruthy()

    global.fetch.mockResolvedValueOnce(jsonResponse({
      message: 'Check-in criado',
      credito_checkins: 7,
      checkin: { id: 1, user_id: 5, checkin_date: todayStr },
    }))

    global.mockNetInfoEmit({ isConnected: true, isInternetReachable: true })

    await waitFor(() => {
      expect(screen.queryByTestId('home-pending-checkin-banner')).toBeNull()
    })

    fireEvent.press(screen.getByTestId('home-day-today'))
    expect(await screen.findByTestId('home-cancel-checkin-button')).toBeTruthy()
  })

  it('restores the credit when a queued check-in is rejected after reconnecting', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 8 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))
      .mockRejectedValueOnce(new TypeError('Network request failed'))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))
    fireEvent.press(await screen.findByTestId('home-checkin-button'))

    expect(await screen.findByText('Voce tem 7 creditos de check-in neste mes.')).toBeTruthy()

    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Check-in encerrado' }, false))
    global.mockNetInfoEmit({ isConnected: true, isInternetReachable: true })

    expect(await screen.findByText('Voce tem 8 creditos de check-in neste mes.')).toBeTruthy()
    expect(screen.queryByTestId('home-pending-checkin-banner')).toBeNull()
  })

  it('treats duplicate check-in errors as an already confirmed check-in', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 7 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Usuario ja fez check-in hoje' }, false))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))
    fireEvent.press(await screen.findByTestId('home-checkin-button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://set-volei-hub-api.onrender.com/auth/me/checkins',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    fireEvent.press(screen.getByTestId('home-day-today'))
    expect(await screen.findByTestId('home-cancel-checkin-button')).toBeTruthy()
  })

  it('does not allow check-in after the training deadline', async () => {
    jest.setSystemTime(TODAY_AT_22)
    global.fetch
      .mockResolvedValueOnce(jsonResponse(apiUser({ credito_checkins: 7 })))
      .mockResolvedValueOnce(jsonResponse({ checkins: [] }))

    render(<Home />)
    await screen.findByText(/Ola, Pedro/)

    fireEvent.press(screen.getByTestId('home-day-today'))

    expect(screen.queryByTestId('home-checkin-button')).toBeNull()
    expect(await screen.findByText('Check-in encerrado para hoje. Faca check-in no proximo treino.')).toBeTruthy()
  })
})
