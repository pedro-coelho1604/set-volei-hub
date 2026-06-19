import * as SecureStore from 'expo-secure-store'
import {
  getCheckins,
  doCheckin,
  cancelEntry,
  countMonthPresent,
} from '../src/storage/checkinStorage'

const SECURE_TOKEN_KEY = 'set_volei_token'
const DAY = '2026-06-19'
const API_URL = 'https://set-volei-hub-api.onrender.com/auth/me/checkins'

function jsonResponse(body, ok = true) {
  return {
    ok,
    text: jest.fn(async () => JSON.stringify(body)),
  }
}

describe('checkinStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, 'abc123')
  })

  it('loads check-ins from the API as a date map', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      checkins: [
        { id: 1, user_id: 5, checkin_date: DAY, created_at: '2026-06-19T12:00:00Z' },
      ],
    }))

    const checkins = await getCheckins('2026-06-15', '2026-06-21')

    expect(checkins).toEqual({
      checkins: { [DAY]: 'present' },
      credito_checkins: undefined,
      loaded: true,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}?date_from=2026-06-15&date_to=2026-06-21`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'bearer abc123' }),
      }),
    )
  })

  it('returns an empty map when the API list is not available yet', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Method Not Allowed' }, false))

    await expect(getCheckins()).resolves.toEqual(expect.objectContaining({
      checkins: {},
      loaded: false,
    }))
  })

  it('creates a check-in through the API', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      message: 'Check-in criado',
      credito_checkins: 7,
      checkin: { id: 1, user_id: 5, checkin_date: DAY, created_at: '2026-06-19T12:00:00Z' },
    }, true))

    await doCheckin(DAY)

    expect(global.fetch).toHaveBeenCalledWith(
      API_URL,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('cancels a check-in through the API', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      message: 'Check-in cancelado',
      credito_checkins: 8,
      checkin: null,
    }))

    await cancelEntry(DAY)

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}?checkin_date=${DAY}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('counts present check-ins in the current month', () => {
    const prefix = new Date().toISOString().slice(0, 7)
    expect(countMonthPresent({
      [`${prefix}-01`]: 'present',
      [`${prefix}-02`]: 'present',
      '2020-01-01': 'present',
    })).toBe(2)
  })
})
