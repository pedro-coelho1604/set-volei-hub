import * as SecureStore from 'expo-secure-store'
import {
  getCheckins,
  doCheckin,
  cancelEntry,
  countMonthPresent,
  getPendingCheckins,
  flushPendingCheckins,
} from '../src/storage/checkinStorage'

const SECURE_TOKEN_KEY = 'set_volei_token'
const DAY = '2026-06-19'
const API_URL = 'https://set-volei-hub-api.onrender.com/auth/me/checkins'

function jsonResponse(body, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
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
      credito_checkins: 7,
      checkins: [
        { id: 1, user_id: 5, checkin_date: DAY, created_at: '2026-06-19T12:00:00Z' },
      ],
    }))

    const checkins = await getCheckins('2026-06-15', '2026-06-21')

    expect(checkins).toEqual({
      checkins: { [DAY]: 'present' },
      credito_checkins: 7,
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
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': expect.stringContaining(`checkin-${DAY}-`) }),
        body: expect.stringContaining('idempotency_key'),
      }),
    )
  })

  it('keeps an offline check-in queued and retries with the same idempotency key', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Network request failed'))

    await expect(doCheckin(DAY, 5)).resolves.toEqual(expect.objectContaining({
      pending: true,
      checkin: { checkin_date: DAY },
    }))

    const [pending] = await getPendingCheckins(5)
    const firstRequest = global.fetch.mock.calls[0][1]

    expect(pending).toEqual(expect.objectContaining({
      dateStr: DAY,
      userId: 5,
      idempotencyKey: firstRequest.headers['Idempotency-Key'],
    }))

    global.fetch.mockResolvedValueOnce(jsonResponse({
      message: 'Check-in criado',
      credito_checkins: 7,
      checkin: { id: 1, user_id: 5, checkin_date: DAY },
    }))

    await expect(flushPendingCheckins(5)).resolves.toEqual([
      expect.objectContaining({ status: 'confirmed', dateStr: DAY }),
    ])

    const retryRequest = global.fetch.mock.calls[1][1]
    expect(retryRequest.headers['Idempotency-Key']).toBe(firstRequest.headers['Idempotency-Key'])
    await expect(getPendingCheckins(5)).resolves.toEqual([])
  })

  it('does not retry a queued check-in for another user', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Network request failed'))
    await doCheckin(DAY, 5)

    await expect(flushPendingCheckins(9)).resolves.toEqual([])
    expect(global.fetch).toHaveBeenCalledTimes(1)
    await expect(getPendingCheckins(5)).resolves.toHaveLength(1)
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
