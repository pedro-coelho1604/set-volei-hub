import { getAuthToken } from './authStorage'

const API_BASE_URL = 'https://set-volei-hub-api.onrender.com'
const CHECKINS_URL = `${API_BASE_URL}/auth/me/checkins`

function toDateStr(date) {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}

function normalizeCheckins(body) {
  const items = Array.isArray(body) ? body : body?.checkins ?? body?.data ?? []

  return items.reduce((acc, item) => {
    const date = item.checkin_date ?? item.date ?? item.dia_checkin
    if (date) acc[date] = 'present'
    return acc
  }, {})
}

async function request(url, options = {}) {
  const token = await getAuthToken()
  if (!token) throw new Error('Sessao expirada. Entre novamente.')

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `bearer ${token}`,
      ...options.headers,
    },
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail
    throw new Error(detail || body?.message || 'Nao foi possivel concluir o check-in.')
  }

  return body
}

export async function getCheckins(dateFrom, dateTo) {
  const params = new URLSearchParams()
  if (dateFrom) params.set('date_from', toDateStr(dateFrom))
  if (dateTo) params.set('date_to', toDateStr(dateTo))

  try {
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const body = await request(`${CHECKINS_URL}${suffix}`)
    return {
      checkins: normalizeCheckins(body),
      credito_checkins: body?.credito_checkins,
      loaded: true,
    }
  } catch (error) {
    return {
      checkins: {},
      credito_checkins: undefined,
      loaded: false,
      error,
    }
  }
}

export async function doCheckin(dateStr) {
  return request(CHECKINS_URL, {
    method: 'POST',
  })
}

export async function cancelEntry(dateStr) {
  const params = new URLSearchParams()
  if (dateStr) params.set('checkin_date', dateStr)

  return request(`${CHECKINS_URL}?${params.toString()}`, {
    method: 'DELETE',
  })
}

export function countMonthPresent(checkins) {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return Object.entries(checkins).filter(([d, v]) => d.startsWith(prefix) && v === 'present').length
}
