import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { getStoredUser } from './auth/storage/authStorage'

export default function RootLayout() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const user = await getStoredUser()
      if (user) {
        router.replace('/(tabs)/')
      } else {
        router.replace('/auth/screens/LoginScreen')
      }
      setChecked(true)
    }
    checkAuth()
  }, [])

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#1f1f1f',
          },
        }}
      />
    </SafeAreaProvider>
  )
}
