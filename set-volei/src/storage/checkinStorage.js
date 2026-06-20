import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuthToken } from './authStorage'

const API_BASE_URL = 'https://set-volei-hub-api.onrender.com'
const CHECKINS_URL = `${API_BASE_URL}/auth/me/checkins`
const PENDING_CHECKINS_KEY = '@set_volei:pending_checkins'

const flushPromises = new Map()

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
  if (!token) {
    const error = new Error('Sessao expirada. Entre novamente.')
    error.status = 401
    throw error
  }

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
  let body = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text }
    }
  }

  if (!response.ok) {
    const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail
    const error = new Error(detail || body?.message || 'Nao foi possivel concluir o check-in.')
    error.status = response.status
    throw error
  }

  return body
}

function createIdempotencyKey(dateStr) {
  return `checkin-${dateStr}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function readPendingCheckins() {
  const data = await AsyncStorage.getItem(PENDING_CHECKINS_KEY)
  if (!data) return []

  try {
    const items = JSON.parse(data)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

async function writePendingCheckins(items) {
  if (items.length === 0) {
    await AsyncStorage.removeItem(PENDING_CHECKINS_KEY)
    return
  }

  await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(items))
}

async function enqueueCheckin(dateStr, userId) {
  const pending = await readPendingCheckins()
  const existing = pending.find((item) => item.dateStr === dateStr && item.userId === userId)
  if (existing) return existing

  const item = {
    dateStr,
    userId,
    idempotencyKey: createIdempotencyKey(dateStr),
    createdAt: new Date().toISOString(),
  }

  await writePendingCheckins([...pending, item])
  return item
}

async function removePendingCheckin(idempotencyKey) {
  const pending = await readPendingCheckins()
  await writePendingCheckins(pending.filter((item) => item.idempotencyKey !== idempotencyKey))
}

function isRetryableError(error) {
  if (typeof error?.status !== 'number') return true
  return error.status === 408 || error.status === 429 || error.status >= 500
}

function isDuplicateError(error) {
  const message = String(error?.message ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return /ja|already|existe|duplic/i.test(message)
}

function postCheckin(item) {
  return request(CHECKINS_URL, {
    method: 'POST',
    headers: { 'Idempotency-Key': item.idempotencyKey },
    body: JSON.stringify({ idempotency_key: item.idempotencyKey }),
  })
}

export async function getPendingCheckins(userId) {
  const pending = await readPendingCheckins()
  return pending.filter((item) => item.userId === userId)
}

export async function flushPendingCheckins(userId) {
  if (flushPromises.has(userId)) return flushPromises.get(userId)

  const flushPromise = (async () => {
    const pending = await getPendingCheckins(userId)
    const results = []

    for (const item of pending) {
      try {
        const result = await postCheckin(item)
        await removePendingCheckin(item.idempotencyKey)
        results.push({ status: 'confirmed', dateStr: item.dateStr, result })
      } catch (error) {
        if (isDuplicateError(error)) {
          await removePendingCheckin(item.idempotencyKey)
          results.push({ status: 'confirmed', dateStr: item.dateStr, result: null })
        } else if (isRetryableError(error)) {
          results.push({ status: 'pending', dateStr: item.dateStr, error })
        } else {
          await removePendingCheckin(item.idempotencyKey)
          results.push({ status: 'failed', dateStr: item.dateStr, error })
        }
      }
    }

    return results
  })()
  flushPromises.set(userId, flushPromise)

  try {
    return await flushPromise
  } finally {
    flushPromises.delete(userId)
  }
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

export async function doCheckin(dateStr, userId = null) {
  const pending = await enqueueCheckin(dateStr, userId)

  try {
    const result = await postCheckin(pending)
    await removePendingCheckin(pending.idempotencyKey)
    return { ...result, pending: false }
  } catch (error) {
    if (isDuplicateError(error)) {
      await removePendingCheckin(pending.idempotencyKey)
      return {
        pending: false,
        duplicate: true,
        checkin: { checkin_date: dateStr },
      }
    }

    if (isRetryableError(error)) {
      return {
        pending: true,
        checkin: { checkin_date: dateStr },
      }
    }

    await removePendingCheckin(pending.idempotencyKey)
    throw error
  }
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
