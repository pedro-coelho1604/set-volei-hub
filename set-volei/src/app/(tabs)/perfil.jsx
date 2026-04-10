import {
  View, Text, StyleSheet, Image, TextInput,
  TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import BottomMenu from '../../components/BottomMenu'
import { useRouter } from 'expo-router'
import { getStoredUser, logout } from '../auth/storage/authStorage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { userMock, planMock } from '../../mocks/userMocks'

const USER_KEY = '@set_volei:user'
const POSICOES = ['Levantador', 'Líbero', 'Ponteiro', 'Oposto', 'Central', 'Outro']

function formatDate(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
}

export default function Perfil() {
  const router = useRouter()

  const [avatar, setAvatar]         = useState('')
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [telefone, setTelefone]     = useState('')
  const [numero, setNumero]         = useState('')
  const [posicao, setPosicao]       = useState('')
  const [peso, setPeso]             = useState('')
  const [altura, setAltura]         = useState('')
  const [nascimento, setNascimento] = useState('')
  const [plan, setPlan]             = useState(null)
  const [edited, setEdited]         = useState(false)
  const [saving, setSaving]         = useState(false)

  const loadUser = useCallback(async () => {
    const stored = await getStoredUser()
    const user = stored ?? userMock
    setAvatar(user.avatar ?? '')
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setTelefone(user.telefone ?? '')
    setNumero(user.numero ?? '')
    setPosicao(user.posicao ?? '')
    setPeso(user.peso ?? '')
    setAltura(user.altura ?? '')
    setNascimento(user.nascimento ?? '')
    setPlan(planMock)
    setEdited(false)
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  function handleChange(setter) {
    return (val) => { setter(val); setEdited(true) }
  }

  function handlePosicao(p) {
    setPosicao(p)
    setEdited(true)
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Atenção', 'Nome e e-mail são obrigatórios.')
      return
    }
    setSaving(true)
    const stored = await getStoredUser()
    const updated = {
      ...(stored ?? userMock),
      name, email, telefone, avatar,
      numero, posicao, peso, altura, nascimento,
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated))
    setSaving(false)
    setEdited(false)
    Alert.alert('Salvo', 'Perfil atualizado com sucesso.')
  }

  async function pickImage() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) { Alert.alert('Permissão negada', 'Precisamos acessar sua galeria.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 })
    if (!result.canceled) { setAvatar(result.assets[0].uri); setEdited(true) }
  }

  async function takePhoto() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) { Alert.alert('Permissão negada', 'Precisamos da câmera.'); return }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
    if (!result.canceled) { setAvatar(result.assets[0].uri); setEdited(true) }
  }

  async function handleLogout() {
    await logout()
    router.replace('/auth/screens/LoginScreen')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Perfil</Text>
          </View>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {numero ? (
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>#{numero}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.avatarName}>{name}</Text>
            {posicao ? <Text style={styles.avatarPosicao}>{posicao}</Text> : null}
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <Text style={styles.photoBtnText}>Galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnText}>Câmera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(peso || altura || numero) ? (
            <View style={styles.statsRow}>
              {numero ? (
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>#{numero}</Text>
                  <Text style={styles.statLbl}>Camisa</Text>
                </View>
              ) : null}
              {altura ? (
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{altura}m</Text>
                  <Text style={styles.statLbl}>Altura</Text>
                </View>
              ) : null}
              {peso ? (
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{peso} kg</Text>
                  <Text style={styles.statLbl}>Peso</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>
            <Field label="Nome" value={name} onChangeText={handleChange(setName)} />
            <Field label="E-mail" value={email} onChangeText={handleChange(setEmail)} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Telefone" value={telefone} onChangeText={handleChange(setTelefone)} keyboardType="phone-pad" last />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados do atleta</Text>

            <Field label="Número da camisa" value={numero} onChangeText={handleChange(setNumero)} keyboardType="numeric" />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Peso</Text>
              <View style={styles.fieldRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={peso}
                  onChangeText={handleChange(setPeso)}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                  placeholder="0"
                />
                <Text style={styles.fieldUnit}>kg</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <Field label="Altura (ex: 1,85)" value={altura} onChangeText={handleChange(setAltura)} keyboardType="decimal-pad" />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Data de nascimento</Text>
              <TextInput
                style={styles.fieldInput}
                value={nascimento}
                onChangeText={(t) => { setNascimento(formatDate(t)); setEdited(true) }}
                keyboardType="default"
                placeholderTextColor="#555"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </View>
            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 10 }]}>Posição</Text>
            <View style={styles.posicaoGrid}>
              {POSICOES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.posicaoChip, posicao === p && styles.posicaoChipActive]}
                  onPress={() => handlePosicao(p)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: posicao === p }}
                >
                  <Text style={[styles.posicaoChipText, posicao === p && styles.posicaoChipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {plan && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plano</Text>
              <View style={styles.planRow}>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{plan.name}</Text>
                </View>
                <Text style={styles.planPrice}>{plan.price}/mês</Text>
              </View>
              <View style={styles.planDetail}>
                <Text style={styles.planDetailLabel}>Vencimento</Text>
                <Text style={styles.planDetailValue}>{plan.expires}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>

        {edited && (
          <TouchableOpacity
            style={[styles.saveFloatBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Salvar alterações do perfil"
          >
            <Text style={styles.saveFloatBtnText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        )}

      </KeyboardAvoidingView>
      <BottomMenu />
    </SafeAreaView>
  )
}

function Field({ label, value, onChangeText, last, ...props }) {
  return (
    <>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#555"
          {...props}
        />
      </View>
      {!last && <View style={styles.divider} />}
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  header: { marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFD600' },
  avatarInitial: { fontSize: 36, fontWeight: 'bold', color: '#FFD600' },
  numberBadge: {
    position: 'absolute', bottom: 0, right: -4,
    backgroundColor: '#FFD600', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  numberBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 11 },
  avatarName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  avatarPosicao: { fontSize: 13, color: '#FFD600', marginBottom: 12 },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  photoBtnText: { color: '#aaa', fontSize: 13 },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#1e1e1e',
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#2a2a2a' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#FFD600' },
  statLbl: { fontSize: 11, color: '#666', marginTop: 2 },

  section: { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  field: { paddingVertical: 4 },
  fieldLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  fieldInput: { color: '#fff', fontSize: 15, paddingVertical: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldUnit: { color: '#555', fontSize: 15, marginLeft: 6 },
  divider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 8 },

  posicaoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  posicaoChip: { borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  posicaoChipActive: { backgroundColor: '#FFD600', borderColor: '#FFD600' },
  posicaoChipText: { color: '#666', fontSize: 13 },
  posicaoChipTextActive: { color: '#000', fontWeight: 'bold' },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  planBadge: { backgroundColor: '#FFD600', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  planPrice: { color: '#fff', fontSize: 15, fontWeight: '600' },
  planDetail: { flexDirection: 'row', justifyContent: 'space-between' },
  planDetailLabel: { color: '#666', fontSize: 13 },
  planDetailValue: { color: '#aaa', fontSize: 13 },

  saveFloatBtn: {
    backgroundColor: '#FFD600', borderRadius: 12, marginHorizontal: 20,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  saveFloatBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  logoutBtn: { borderWidth: 1, borderColor: '#ff4d4d', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 15 },
})
