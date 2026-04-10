import { View, Text, StyleSheet } from "react-native"
import BottomMenu from "../../components/BottomMenu"

export default function Home() {
  return (
    <View style={styles.container}>
      <Text>Home</Text>

      <BottomMenu />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f1f1f',
  },
});