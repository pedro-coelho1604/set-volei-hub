/**
 * Unit tests — countMonthPresent (pure function).
 *
 * `countMonthPresent(checkins)` counts how many days in the CURRENT month
 * are marked as 'present'. Justified absences and other months must not count.
 */
import { countMonthPresent } from '../src/app/home/storage/checkinStorage'

// Build a YYYY-MM-DD key inside the current month so the test stays valid
// regardless of when it runs.
function currentMonthDay(day) {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${String(day).padStart(2, '0')}`
}

describe('countMonthPresent', () => {
  it('returns 0 for an empty object', () => {
    expect(countMonthPresent({})).toBe(0)
  })

  it('counts only present days in the current month', () => {
    const checkins = {
      [currentMonthDay(1)]: 'present',
      [currentMonthDay(3)]: 'present',
      [currentMonthDay(5)]: 'justified', // not counted
    }
    expect(countMonthPresent(checkins)).toBe(2)
  })

  it('ignores present days from other months', () => {
    const checkins = {
      '2020-01-10': 'present', // far past, different month
      [currentMonthDay(2)]: 'present',
    }
    expect(countMonthPresent(checkins)).toBe(1)
  })

  it('does not count justified absences', () => {
    const checkins = {
      [currentMonthDay(2)]: 'justified',
      [currentMonthDay(4)]: 'justified',
    }
    expect(countMonthPresent(checkins)).toBe(0)
  })
})
