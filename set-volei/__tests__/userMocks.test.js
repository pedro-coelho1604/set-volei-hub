/**
 * Unit tests — getTrainingDays (domain rule from src/mocks/userMocks.js).
 *
 * The club trains on Tuesdays (2) and Thursdays (4). The helper always
 * returns those base days, and additionally includes "today" so the user
 * can check in on the current day even if it is not a regular training day.
 */
import { getTrainingDays, userMock, planMock } from '../src/mocks/userMocks'

describe('getTrainingDays', () => {
  it('always includes the fixed training days (Tue=2, Thu=4)', () => {
    const days = getTrainingDays()
    expect(days).toEqual(expect.arrayContaining([2, 4]))
  })

  it('includes today so check-in is possible on the current day', () => {
    const todayDow = new Date().getDay()
    expect(getTrainingDays()).toContain(todayDow)
  })

  it('returns exactly the base days when today is already a training day', () => {
    const todayDow = new Date().getDay()
    const days = getTrainingDays()

    if (todayDow === 2 || todayDow === 4) {
      expect(days).toEqual([2, 4])
    } else {
      expect(days).toEqual([2, 4, todayDow])
    }
  })

  it('only ever contains valid weekday indexes (0-6)', () => {
    getTrainingDays().forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(6)
    })
  })
})

describe('mocks shape', () => {
  it('exposes a usable mock user with login credentials', () => {
    expect(userMock).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
      name: expect.any(String),
    })
  })

  it('exposes a plan with a name and an expiry date', () => {
    expect(planMock.name).toBeTruthy()
    expect(planMock.expires).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })
})
