import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomMenu from '../../components/BottomMenu'

export default function Home() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>      
      <Text>Home</Text>

      <BottomMenu />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f1f1f',
  },
});