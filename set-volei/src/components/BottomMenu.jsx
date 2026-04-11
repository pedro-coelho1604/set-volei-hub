import { View, TouchableOpacity, Text, StyleSheet } from "react-native"
import { useRouter, usePathname } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

const TABS = [
  { label: 'Home', icon: 'home', route: '/' },
  { label: 'Mapa', icon: 'map', route: '/mapa' },
  { label: 'Perfil', icon: 'person', route: '/perfil' },
]

export default function BottomMenu() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {TABS.map(({ label, icon, route }) => {
          const active = pathname === route
          return (
            <TouchableOpacity
              key={route}
              style={styles.tab}
              onPress={() => router.push(route)}
            >
              <Ionicons name={icon} size={24} color={active ? '#FFD600' : '#555'} />
              <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingBottom: 25,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    marginBottom: 15,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
  },
  text: {
    color: '#555',
    fontSize: 12,
  },
  textActive: {
    color: '#FFD600',
  },
})
