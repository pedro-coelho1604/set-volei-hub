import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { getStoredUser } from './auth/storage/authStorage'
import SplashScreenView from '../components/SplashScreenView'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const [user] = await Promise.all([
        getStoredUser(),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ])

      if (user) {
        router.replace('/(tabs)/')
      } else {
        router.replace('/auth/screens/LoginScreen')
      }
    }

    checkAuth()
  }, [])

  return <SplashScreenView />
}
