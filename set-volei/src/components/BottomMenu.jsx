import { View, TouchableOpacity, Text, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

export default function BottomMenu() {
  const router = useRouter()

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Ionicons name="home" size={24} color="#fff" />
          <Text style={styles.text}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/mapa")}>
          <Ionicons name="map" size={24} color="#fff" />
          <Text style={styles.text}>Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons name="person" size={24} color="#fff" />
          <Text style={styles.text}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000000",
    paddingBottom: 25, 
  },

  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 20,
    marginBottom: 15,
  },

  text: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
})