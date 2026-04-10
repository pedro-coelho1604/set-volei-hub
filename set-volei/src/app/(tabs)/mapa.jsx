import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useEffect, useState, useRef } from 'react'
import * as Location from 'expo-location'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import BottomMenu from '../../components/BottomMenu'
import logo from '../../../assets/set_icon.png'

export default function Mapa() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState(null)

  const mapRef = useRef(null)

  const defaultRegion = {
    latitude: -22.4,
    longitude: -43.5,
    latitudeDelta: 0.4,
    longitudeDelta: 0.4,
  }

  const unidades = [
    {
      id: 1,
      nome: 'Miguel Pereira',
      latitude: -22.4572,
      longitude: -43.4689,
      endereco: 'Centro, Miguel Pereira - RJ',
      telefone: '(24) 99999-0001',
      imagem: logo,
    },
    {
      id: 2,
      nome: 'Barra do Piraí',
      latitude: -22.4711,
      longitude: -43.8269,
      endereco: 'Centro, Barra do Piraí - RJ',
      telefone: '(24) 99999-0002',
      imagem: logo,
    },
    {
      id: 3,
      nome: 'Três Rios',
      latitude: -22.1165,
      longitude: -43.2096,
      endereco: 'Centro, Três Rios - RJ',
      telefone: '(24) 99999-0003',
      imagem: logo,
    },
    {
      id: 4,
      nome: 'Vassouras',
      latitude: -22.4056,
      longitude: -43.6633,
      endereco: 'Centro, Vassouras - RJ',
      telefone: '(24) 99999-0004',
      imagem: logo,
    },
  ]

  useEffect(() => {
    getLocation()
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const pontos = unidades.map((u) => ({
      latitude: u.latitude,
      longitude: u.longitude,
    }))

    if (location) {
      pontos.push({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    }

    setTimeout(() => {
      mapRef.current.fitToCoordinates(pontos, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: 200,
          left: 50,
        },
        animated: true,
      })
    }, 500)
  }, [location])

  async function getLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        setLocation(null)
        return
      }

      const loc = await Location.getCurrentPositionAsync({})
      setLocation(loc.coords)
    } catch (error) {
      setLocation(null)
    } finally {
      setLoading(false)
    }
  }

  function handleCenterUser() {
    if (!location || !mapRef.current) return

    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      1000
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={!!location}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Você está aqui"
            pinColor="blue"
          />
        )}

        {unidades.map((unidade) => (
          <Marker
            key={unidade.id}
            coordinate={{
              latitude: unidade.latitude,
              longitude: unidade.longitude,
            }}
            onPress={() => setSelectedUnit(unidade)}
          />
        ))}
      </MapView>

      <TouchableOpacity
        style={[
          styles.locateButton,
          !location && styles.locateButtonDisabled,
        ]}
        onPress={handleCenterUser}
        disabled={!location}
        activeOpacity={location ? 0.7 : 1}
      >
        <Ionicons
          name="locate"
          size={24}
          color={location ? '#fff' : '#888'}
        />
      </TouchableOpacity>

      {selectedUnit && (
        <View style={styles.card}>
        <Image source={selectedUnit.imagem} style={styles.cardImage} />

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{selectedUnit.nome}</Text>
            <Text style={styles.cardText}>{selectedUnit.endereco}</Text>
            <Text style={styles.cardText}>{selectedUnit.telefone}</Text>    

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedUnit(null)}
            >
              <Text style={{ color: '#fff' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <BottomMenu />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f1f1f',
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
  },

  locateButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  locateButtonDisabled: {
    opacity: 0.5,
  },
  card: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    marginBottom: 20
  },
  cardImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardText: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
})