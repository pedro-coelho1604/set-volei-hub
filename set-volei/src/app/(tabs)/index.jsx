import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal, Pressable, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import BottomMenu from '../../components/BottomMenu'
import { userMock, planMock, getTrainingDays, championshipsMock } from '../../mocks/userMocks'
import { fetchCurrentUser, getStoredUser } from '../../storage/authStorage'
import {
  getCheckins,
  doCheckin,
  cancelEntry,
  getPendingCheckins,
  flushPendingCheckins,
} from '../../storage/checkinStorage'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_GOAL = 8
const CHECKIN_DEADLINE_HOUR = 21

function getWeekDays() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function daysUntil(dateStr) {
  const [day, month, year] = dateStr.split('/')
  const target = new Date(`${year}-${month}-${day}`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function getNextTraining(trainingDays) {
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (trainingDays.includes(d.getDay())) return d
  }
  return null
}

function getDaysDiff(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const router = useRouter()
  const today = new Date()
  const todayStr = toDateStr(today)
  const weekDays = getWeekDays()
  const canCheckinToday = today.getHours() < CHECKIN_DEADLINE_HOUR

  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [trainingDays, setTrainingDays] = useState([])
  const [checkins, setCheckins] = useState({})
  const [checkinsLoaded, setCheckinsLoaded] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [loadingCheckin, setLoadingCheckin] = useState(null)

  const loadData = useCallback(async () => {
    const currentUser = await fetchCurrentUser()
    const storedUser = currentUser ?? await getStoredUser()
    const week = getWeekDays()

    const checkinResult = await getCheckins(toDateStr(week[0]), toDateStr(week[6]))
    const nextUser = storedUser ?? userMock
    const pending = await getPendingCheckins(nextUser.id)
    const pendingMap = pending.reduce((acc, item) => {
      acc[item.dateStr] = 'pending'
      return acc
    }, {})

    setUser({
      ...nextUser,
      credito_checkins: checkinResult.credito_checkins ?? nextUser.credito_checkins,
    })
    setPlan(planMock)
    setTrainingDays(getTrainingDays())
    setCheckins({ ...pendingMap, ...checkinResult.checkins })
    setCheckinsLoaded(checkinResult.loaded)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const syncPending = useCallback(async () => {
    if (!user?.id) return

    let results
    try {
      results = await flushPendingCheckins(user.id)
    } catch {
      return
    }

    if (results.length === 0) return

    setCheckins((current) => {
      const updated = { ...current }
      results.forEach(({ status: syncStatus, dateStr }) => {
        if (syncStatus === 'confirmed') updated[dateStr] = 'present'
        if (syncStatus === 'failed') delete updated[dateStr]
      })
      return updated
    })

    const confirmedWithCredits = [...results]
      .reverse()
      .find(({ status: syncStatus, result }) => (
        syncStatus === 'confirmed' && result?.credito_checkins !== undefined
      ))

    if (confirmedWithCredits) {
      setUser((current) => ({
        ...(current ?? userMock),
        credito_checkins: confirmedWithCredits.result.credito_checkins,
      }))
    } else {
      const failedCount = results.filter(({ status: syncStatus }) => syncStatus === 'failed').length
      if (failedCount > 0) {
        setUser((current) => ({
          ...(current ?? userMock),
          credito_checkins: Math.min(
            MONTH_GOAL,
            (current?.credito_checkins ?? MONTH_GOAL) + failedCount,
          ),
        }))
      }
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return undefined

    const unsubscribe = NetInfo.addEventListener((state) => {
      const hasConnection = state.isConnected !== false && state.isInternetReachable !== false
      if (hasConnection) syncPending()
    })

    return unsubscribe
  }, [syncPending, user?.id])

  const daysLeft = plan ? daysUntil(plan.expires) : 0
  const checkinCredits = user?.credito_checkins ?? MONTH_GOAL
  const usedCredits = Math.max(0, MONTH_GOAL - checkinCredits)
  const progress = Math.min(usedCredits / MONTH_GOAL, 1)
  const firstName = (user?.name ?? '').split(' ')[0]
  const nextTraining = getNextTraining(trainingDays)
  const nextDiff = nextTraining ? getDaysDiff(nextTraining) : null
  const status = selectedDay ? checkins[selectedDay.dateStr] : null
  const pendingCount = Object.values(checkins).filter((value) => value === 'pending').length

  async function handleCheckin(dateStr) {
    setLoadingCheckin(dateStr)
    try {
      const result = await doCheckin(dateStr, user?.id)
      const confirmedDate = result?.checkin?.checkin_date ?? dateStr
      setCheckins((current) => ({
        ...current,
        [confirmedDate]: result?.pending ? 'pending' : 'present',
      }))
      setCheckinsLoaded(true)
      setUser((current) => ({
        ...(current ?? userMock),
        credito_checkins: result?.credito_checkins ?? Math.max(0, (current?.credito_checkins ?? MONTH_GOAL) - 1),
      }))
      setSelectedDay(null)
    } catch (error) {
      const message = error?.message ?? ''
      if (/ja|j[aá]|already|existe|duplic/i.test(message)) {
        setCheckins((current) => ({ ...current, [dateStr]: 'present' }))
        setCheckinsLoaded(true)
        setSelectedDay(null)
      } else {
        Alert.alert('Erro', message || 'Nao foi possivel fazer check-in.')
      }
    } finally {
      setLoadingCheckin(null)
    }
  }

  async function handleCancelEntry(dateStr) {
    setLoadingCheckin(dateStr)
    try {
      const result = await cancelEntry(dateStr)
      setCheckins((current) => {
        const updated = { ...current }
        delete updated[dateStr]
        return updated
      })
      setCheckinsLoaded(true)
      setUser((current) => ({
        ...(current ?? userMock),
        credito_checkins: result?.credito_checkins ?? Math.min(MONTH_GOAL, (current?.credito_checkins ?? MONTH_GOAL) + 1),
      }))
      setSelectedDay(null)
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel cancelar o check-in.')
    } finally {
      setLoadingCheckin(null)
    }
  }

  function openDay(day) {
    const dateStr = toDateStr(day)
    const isTraining = trainingDays.includes(day.getDay())
    const isToday = dateStr === todayStr
    setSelectedDay({ date: day, dateStr, isTraining, isToday })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ola, {firstName}!</Text>
            <Text style={styles.date}>
              {DAY_LABELS[today.getDay()]}, {today.getDate()} de {MONTH_NAMES[today.getMonth()]}
            </Text>
          </View>
          <TouchableOpacity
            testID="home-avatar-button"
            accessibilityRole="button"
            accessibilityLabel="Ir para o perfil"
            onPress={() => router.push('/perfil')}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.monthCard}>
          <Text style={styles.monthCardText}>
            {checkinCredits > 0
              ? `Voce tem ${checkinCredits} credito${checkinCredits !== 1 ? 's' : ''} de check-in neste mes.`
              : 'Voce usou todos os creditos de check-in deste mes.'}
          </Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressSub}>{usedCredits} de {MONTH_GOAL} creditos usados</Text>
        </View>

        {pendingCount > 0 && (
          <View testID="home-pending-checkin-banner" style={styles.pendingBanner}>
            <Text style={styles.pendingBannerTitle}>Check-in aguardando internet</Text>
            <Text style={styles.pendingBannerText}>
              O envio sera concluido automaticamente quando a conexao voltar.
            </Text>
          </View>
        )}

        {nextTraining && (
          <View style={styles.nextTrainingCard}>
            <Text style={styles.nextTrainingLabel}>Proximo treino</Text>
            <Text style={styles.nextTrainingValue}>
              {DAY_LABELS[nextTraining.getDay()]}, {nextTraining.getDate()} de {MONTH_NAMES[nextTraining.getMonth()]}
              {'  '}
              <Text style={styles.nextTrainingDiff}>
                {nextDiff === 1 ? 'amanha' : `em ${nextDiff} dias`}
              </Text>
            </Text>
          </View>
        )}

        <View style={[styles.nextTrainingCard, daysLeft <= 7 && styles.cardWarning]}>
          <Text style={styles.nextTrainingLabel}>Mensalidade - {plan?.name}</Text>
          <Text style={styles.nextTrainingValue}>
            {daysLeft > 0 ? 'Vence em ' : 'Vencida ha '}
            <Text style={[styles.nextTrainingDiff, daysLeft <= 7 && { color: '#ff6b00' }]}>
              {Math.abs(daysLeft)} dia{Math.abs(daysLeft) !== 1 ? 's' : ''}
            </Text>
            {daysLeft > 0 ? ` - ${plan?.expires}` : ''}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Treinos da semana</Text>
        <Text style={styles.sectionHint}>Toque em um dia de treino para detalhes</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const isTraining = trainingDays.includes(day.getDay())
            const isToday = toDateStr(day) === todayStr
            const dateStr = toDateStr(day)
            const st = checkins[dateStr]
            const showAbsence = isTraining && checkinsLoaded && st !== 'present'

            return (
              <TouchableOpacity
                key={dateStr}
                testID={isToday ? 'home-day-today' : `home-day-${dateStr}`}
                accessibilityLabel={`Dia ${DAY_LABELS[day.getDay()]} ${day.getDate()}`}
                activeOpacity={isTraining ? 0.7 : 1}
                onPress={() => isTraining && openDay(day)}
                style={[
                  styles.dayBox,
                  isTraining && styles.dayBoxTraining,
                  isToday && styles.dayBoxToday,
                  st === 'present' && styles.dayBoxPresent,
                  st === 'pending' && styles.dayBoxPending,
                ]}
              >
                <Text style={[
                  styles.dayLabel,
                  isTraining && styles.dayLabelTraining,
                  isToday && { color: '#000' },
                  st === 'present' && { color: '#fff' },
                  st === 'pending' && { color: '#fff' },
                ]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[
                  styles.dayNum,
                  isToday && styles.dayNumToday,
                  st === 'present' && { color: '#fff' },
                  st === 'pending' && { color: '#fff' },
                ]}>
                  {day.getDate()}
                </Text>
                {isTraining && (
                  st === 'present'
                    ? <Text style={[styles.statusIcon, { color: '#4caf50' }]}>OK</Text>
                    : st === 'pending'
                      ? <Text style={[styles.statusIcon, { color: '#FFD600' }]}>...</Text>
                    : showAbsence
                      ? <Text style={[styles.statusIcon, isToday ? { color: '#000' } : { color: '#ff4d4d' }]}>F</Text>
                      : <ActivityIndicator testID={`home-day-loading-${dateStr}`} size="small" color={isToday ? '#000' : '#FFD600'} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.sectionTitle}>Campeonatos proximos</Text>
        {championshipsMock.map((c) => (
          <View key={c.id} style={styles.championCard}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.championName}>{c.name}</Text>
              <Text style={styles.championDetail}>{c.date}</Text>
              <Text style={styles.championDetail}>{c.location}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>

      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDay(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            {selectedDay && (
              <>
                <Text style={styles.modalTitle}>
                  {DAY_LABELS[selectedDay.date.getDay()]}, {selectedDay.date.getDate()} de {MONTH_NAMES[selectedDay.date.getMonth()]}
                </Text>
                {!selectedDay.isTraining ? (
                  <Text style={styles.modalSub}>Sem treino neste dia.</Text>
                ) : (
                  <>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Horario</Text>
                      <Text style={styles.modalInfoValue}>19h00 - 21h00</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Local</Text>
                      <Text style={styles.modalInfoValue}>Quadra Principal</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Status</Text>
                      <Text style={[
                        styles.modalInfoValue,
                        status === 'present'
                          ? { color: '#4caf50' }
                          : status === 'pending'
                            ? { color: '#FFD600' }
                            : { color: '#ff4d4d' },
                      ]}>
                        {status === 'present'
                          ? 'Check-in confirmado'
                          : status === 'pending'
                            ? 'Aguardando internet'
                            : 'Falta'}
                      </Text>
                    </View>

                    {status === 'pending' ? (
                      <View style={styles.pendingModalCard}>
                        <ActivityIndicator color="#FFD600" />
                        <Text style={styles.pendingModalText}>
                          Seu check-in esta salvo e sera enviado automaticamente.
                        </Text>
                      </View>
                    ) : status === 'present' ? (
                      <TouchableOpacity
                        testID="home-cancel-checkin-button"
                        style={styles.btnCancel}
                        onPress={() => handleCancelEntry(selectedDay.dateStr)}
                        disabled={loadingCheckin === selectedDay.dateStr}
                      >
                        {loadingCheckin === selectedDay.dateStr
                          ? <ActivityIndicator color="#ff4d4d" />
                          : <Text style={styles.btnCancelText}>Cancelar check-in</Text>}
                      </TouchableOpacity>
                    ) : selectedDay.isToday && canCheckinToday ? (
                      <TouchableOpacity
                        testID="home-checkin-button"
                        accessibilityRole="button"
                        accessibilityLabel="Fazer check-in"
                        style={styles.btnCheckin}
                        onPress={() => handleCheckin(selectedDay.dateStr)}
                        disabled={loadingCheckin === selectedDay.dateStr || checkinCredits <= 0}
                      >
                        {loadingCheckin === selectedDay.dateStr
                          ? <ActivityIndicator color="#000" />
                          : <Text style={styles.btnCheckinText}>Fazer check-in</Text>}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.blockedCard}>
                        <Text style={styles.blockedText}>
                          {selectedDay.isToday
                            ? 'Check-in encerrado para hoje. Faca check-in no proximo treino.'
                            : 'Check-in disponivel apenas no dia do treino.'}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedDay(null)}>
                  <Text style={styles.modalCloseText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <BottomMenu />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  date: { fontSize: 13, color: '#666', marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#FFD600' },
  avatarPlaceholder: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFD600', fontSize: 18, fontWeight: 'bold' },

  monthCard: {
    backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FFD600',
  },
  monthCardText: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  progressBg: { height: 5, backgroundColor: '#2a2a2a', borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: '#FFD600', borderRadius: 3 },
  progressSub: { fontSize: 11, color: '#555', marginTop: 6 },
  cardWarning: { borderLeftColor: '#ff6b00' },
  pendingBanner: {
    backgroundColor: '#211d08',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD600',
    padding: 12,
    marginBottom: 12,
  },
  pendingBannerTitle: { color: '#FFD600', fontSize: 13, fontWeight: 'bold' },
  pendingBannerText: { color: '#aaa', fontSize: 12, lineHeight: 17, marginTop: 3 },

  nextTrainingCard: {
    backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#FFD600',
  },
  nextTrainingLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  nextTrainingValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
  nextTrainingDiff: { color: '#FFD600', fontWeight: 'bold' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  sectionHint: { fontSize: 11, color: '#555', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  dayBox: {
    flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2,
    borderRadius: 10, backgroundColor: '#1e1e1e', gap: 4, minHeight: 72,
  },
  dayBoxTraining: { backgroundColor: '#1a1600', borderWidth: 1, borderColor: '#333' },
  dayBoxToday: { backgroundColor: '#FFD600' },
  dayBoxPresent: { backgroundColor: '#1a3a1a', borderColor: '#4caf50', borderWidth: 1 },
  dayBoxPending: { backgroundColor: '#302900', borderColor: '#FFD600', borderWidth: 1 },
  dayLabel: { fontSize: 10, color: '#666' },
  dayLabelTraining: { color: '#aaa' },
  dayNum: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  dayNumToday: { color: '#000' },
  statusIcon: { fontSize: 12, fontWeight: 'bold' },

  championCard: {
    flexDirection: 'row', backgroundColor: '#1e1e1e', borderRadius: 14,
    padding: 16, marginBottom: 12, alignItems: 'center', gap: 14,
  },
  championName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  championDetail: { fontSize: 12, color: '#888' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  modalSub: { color: '#666', fontSize: 14 },
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  modalInfoLabel: { color: '#666', fontSize: 13 },
  modalInfoValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  btnCheckin: { backgroundColor: '#FFD600', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnCheckinText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  btnCancel: { borderWidth: 1, borderColor: '#ff4d4d', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  btnCancelText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 14 },
  pendingModalCard: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingModalText: { color: '#bbb', fontSize: 13, lineHeight: 18, flex: 1 },
  blockedCard: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ff4d4d',
    padding: 12,
    marginTop: 10,
  },
  blockedText: { color: '#888', fontSize: 13 },
  modalClose: { marginTop: 4, alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { color: 'white' },
})
