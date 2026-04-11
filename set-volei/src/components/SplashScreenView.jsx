import { useEffect, useRef } from 'react'
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')

export default function SplashScreenView() {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center', gap: 24 }}>
        <View style={styles.iconWrapper}>
          <Image
            source={require('../../assets/set_icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        <Animated.Text style={styles.title}>SET VÔLEI</Animated.Text>

        <Animated.Text style={styles.credits}>
          Heloisa Cabral · Pedro Coelho · Bernardo Duque
        </Animated.Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 5,
  },
  credits: {
    fontSize: width * 0.03,
    color: '#333',
    letterSpacing: 1,
    textAlign: 'center',
  },
})
