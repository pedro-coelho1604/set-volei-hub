import AsyncStorage from '@react-native-async-storage/async-storage'

const CHECKIN_KEY = '@set_volei:checkins'
const JUSTIF_KEY  = '@set_volei:justifications'

export async function getCheckins() {
  const raw = await AsyncStorage.getItem(CHECKIN_KEY)
  return raw ? JSON.parse(raw) : {}
}

export async function doCheckin(dateStr) {
  const checkins = await getCheckins()
  checkins[dateStr] = 'present'
  await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins))
}

export async function doJustify(dateStr, reason) {
  const checkins = await getCheckins()
  checkins[dateStr] = 'justified'
  await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins))

  const raw = await AsyncStorage.getItem(JUSTIF_KEY)
  const justifs = raw ? JSON.parse(raw) : {}
  justifs[dateStr] = reason
  await AsyncStorage.setItem(JUSTIF_KEY, JSON.stringify(justifs))
}

export async function getJustifications() {
  const raw = await AsyncStorage.getItem(JUSTIF_KEY)
  return raw ? JSON.parse(raw) : {}
}

export async function cancelEntry(dateStr) {
  const checkins = await getCheckins()
  delete checkins[dateStr]
  await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins))

  const raw = await AsyncStorage.getItem(JUSTIF_KEY)
  const justifs = raw ? JSON.parse(raw) : {}
  delete justifs[dateStr]
  await AsyncStorage.setItem(JUSTIF_KEY, JSON.stringify(justifs))
}

export function countMonthPresent(checkins) {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return Object.entries(checkins).filter(([d, v]) => d.startsWith(prefix) && v === 'present').length
}
