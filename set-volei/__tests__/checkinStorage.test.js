/**
 * Unit tests — check-in storage layer.
 *
 * Covers `src/app/home/storage/checkinStorage.js`:
 *   - doCheckin marks a day as 'present'
 *   - doJustify marks a day as 'justified' and stores the reason
 *   - cancelEntry removes both the status and the justification
 *   - the getters return {} when nothing is stored yet
 *
 * AsyncStorage is mocked globally in jest.setup.js (in-memory + auto-cleared).
 */
import {
  getCheckins,
  doCheckin,
  doJustify,
  getJustifications,
  cancelEntry,
} from '../src/app/home/storage/checkinStorage'

const DAY = '2026-06-11'

describe('checkinStorage', () => {
  it('starts empty', async () => {
    await expect(getCheckins()).resolves.toEqual({})
    await expect(getJustifications()).resolves.toEqual({})
  })

  it('records a presence with doCheckin', async () => {
    await doCheckin(DAY)

    const checkins = await getCheckins()
    expect(checkins[DAY]).toBe('present')
  })

  it('records a justified absence with a reason', async () => {
    await doJustify(DAY, 'Consulta médica')

    const checkins = await getCheckins()
    const justifs = await getJustifications()

    expect(checkins[DAY]).toBe('justified')
    expect(justifs[DAY]).toBe('Consulta médica')
  })

  it('overwrites a previous status when justifying after a check-in', async () => {
    await doCheckin(DAY)
    await doJustify(DAY, 'Mudou de ideia')

    const checkins = await getCheckins()
    expect(checkins[DAY]).toBe('justified')
  })

  it('cancelEntry removes both the status and the justification', async () => {
    await doJustify(DAY, 'Viagem')
    await cancelEntry(DAY)

    const checkins = await getCheckins()
    const justifs = await getJustifications()

    expect(checkins[DAY]).toBeUndefined()
    expect(justifs[DAY]).toBeUndefined()
  })

  it('keeps other days untouched when cancelling one entry', async () => {
    await doCheckin('2026-06-09')
    await doCheckin('2026-06-11')
    await cancelEntry('2026-06-09')

    const checkins = await getCheckins()
    expect(checkins['2026-06-09']).toBeUndefined()
    expect(checkins['2026-06-11']).toBe('present')
  })
})
