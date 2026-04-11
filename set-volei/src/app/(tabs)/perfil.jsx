import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import * as ImagePicker from 'expo-image-picker'
import BottomMenu from '../../components/BottomMenu'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { userMock, planMock } from '../../mocks/userMocks'
import { logout } from '../auth/storage/authStorage'

export default function Perfil() {
  const router = useRouter()
  const [avatar, setAvatar] = useState(userMock.avatar)

  const [name, setName] = useState(userMock.name)
  const [email, setEmail] = useState(userMock.email)
  const [telefone, setTelefone] = useState(userMock.telefone)

  const plan = planMock

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      const data = await AsyncStorage.getItem('user')

      if (data) {
        const user = JSON.parse(data)

        setAvatar(user.avatar ?? userMock.avatar)
        setName(user.name ?? userMock.name)
        setEmail(user.email ?? userMock.email)
        setTelefone(user.telefone ?? userMock.telefone)
      }
    } catch (e) {
      console.log('Erro ao carregar usuário')
    }
  }

  async function saveUser(updatedFields) {
    try {
      const existing = await AsyncStorage.getItem('user')
      const currentData = existing ? JSON.parse(existing) : {}

      const newData = {
        ...currentData,
        ...updatedFields,
      }

      await AsyncStorage.setItem('user', JSON.stringify(newData))
    } catch (e) {
      console.log('Erro ao salvar usuário')
    }
  }

  async function pickImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permissão negada', 'Precisamos acessar sua galeria')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri

      setAvatar(uri)
      saveUser({ avatar: uri })
    }
  }

  async function takePhoto() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permissão negada', 'Precisamos da câmera')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri

      setAvatar(uri)
      saveUser({ avatar: uri })
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} />

      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatar }} style={styles.avatar} />

        <View style={styles.photoActions}>
          <TouchableOpacity onPress={pickImage} style={styles.btnSmall}>
            <Text style={styles.btnText}>Galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={takePhoto} style={styles.btnSmall}>
            <Text style={styles.btnText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text)
            saveUser({ name: text })
          }}
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text)
            saveUser({ email: text })
          }}
          style={styles.input}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          value={telefone}
          onChangeText={(text) => {
            setTelefone(text)
            saveUser({ telefone: text })
          }}
          style={styles.input}
        />
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Plano atual</Text>

        <Text style={styles.planText}>Nome: {plan.name}</Text>
        <Text style={styles.planText}>Preço: {plan.price}</Text>
        <Text style={styles.planText}>Vencimento: {plan.expires}</Text>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await logout()
          router.replace('/auth/screens/LoginScreen')
        }}
      >
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <BottomMenu />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 20,
  },

  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#fff',
  },

  photoActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },

  btnSmall: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 8,
  },

  btnText: {
    color: '#fff',
    fontSize: 12,
  },

  card: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },

  label: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },

  planCard: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },

  planTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  planText: {
    color: '#ccc',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: '#E53935',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
})