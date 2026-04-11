import AsyncStorage from '@react-native-async-storage/async-storage'

const CHECKIN_KEY = '@set_volei:checkins'

export async function getCheckins() {
  const raw = await AsyncStorage.getItem(CHECKIN_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function doCheckin(dateStr) {
  const checkins = await getCheckins()
  if (!checkins.includes(dateStr)) {
    checkins.push(dateStr)
    await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins))
  }
}

export async function hasCheckin(dateStr) {
  const checkins = await getCheckins()
  return checkins.includes(dateStr)
}
