import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import BottomMenu from '../../components/BottomMenu'
import { userMock, planMock, getTrainingDays, championshipsMock } from '../../mocks/userMocks'
import { getStoredUser } from '../auth/storage/authStorage'
import {
  getCheckins, doCheckin, doJustify,
  getJustifications, countMonthPresent, cancelEntry,
} from '../home/storage/checkinStorage'

const DAY_LABELS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_GOAL  = 8

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

  const [user, setUser]               = useState(null)
  const [plan, setPlan]               = useState(null)
  const [trainingDays, setTrainingDays] = useState([])
  const [checkins, setCheckins]       = useState({})
  const [justifs, setJustifs]         = useState({})
  const [loadingCheckin, setLoadingCheckin] = useState(null)


  const [selectedDay, setSelectedDay] = useState(null)
  const [justifyText, setJustifyText] = useState('')
  const [justifyLoading, setJustifyLoading] = useState(false)

  const loadData = useCallback(async () => {
    const storedUser = await getStoredUser()
    setUser(storedUser ?? userMock)
    setPlan(planMock)
    setTrainingDays(getTrainingDays())
    const c = await getCheckins()
    const j = await getJustifications()
    setCheckins(c)
    setJustifs(j)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const daysLeft     = plan ? daysUntil(plan.expires) : 0
  const monthPresent = countMonthPresent(checkins)
  const progress     = Math.min(monthPresent / MONTH_GOAL, 1)
  const firstName    = (user?.name ?? '').split(' ')[0]
  const nextTraining = getNextTraining(trainingDays)
  const nextDiff     = nextTraining ? getDaysDiff(nextTraining) : null

  async function handleCheckin(dateStr) {
    setLoadingCheckin(dateStr)
    await doCheckin(dateStr)
    await loadData()
    setLoadingCheckin(null)
    setSelectedDay(null)
  }

  async function handleCancelEntry(dateStr) {
    await cancelEntry(dateStr)
    await loadData()
    setSelectedDay(null)
  }

  async function handleJustify() {
    if (!justifyText.trim() || !selectedDay) return
    Keyboard.dismiss()
    setJustifyLoading(true)
    await doJustify(selectedDay.dateStr, justifyText.trim())
    await loadData()
    setJustifyLoading(false)
    setJustifyText('')
    setSelectedDay(null)
  }

  function closeModal() {
    Keyboard.dismiss()
    setSelectedDay(null)
  }

  function openDay(day) {
    const dateStr   = toDateStr(day)
    const isTraining = trainingDays.includes(day.getDay())
    const isPast    = dateStr < todayStr
    const isToday   = dateStr === todayStr
    setJustifyText(justifs[dateStr] ?? '')
    setSelectedDay({ date: day, dateStr, isTraining, isPast, isToday })
  }

  const status = selectedDay ? checkins[selectedDay.dateStr] : null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName}!</Text>
            <Text style={styles.date}>
              {DAY_LABELS[today.getDay()]}, {today.getDate()} de {MONTH_NAMES[today.getMonth()]}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/perfil')}>
            <Image source={{ uri: user?.avatar ?? userMock.avatar }} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        <View style={styles.monthCard}>
          <Text style={styles.monthCardText}>
            {monthPresent >= MONTH_GOAL
              ? `Você bateu a meta de ${MONTH_GOAL} treinos esse mês!`
              : monthPresent === 0
                ? `Você ainda tem ${MONTH_GOAL} treinos esse mês. Bora começar!`
                : `Você já fez ${monthPresent} treino${monthPresent > 1 ? 's' : ''} esse mês. Restam ${MONTH_GOAL - monthPresent} treinos!`}
          </Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressSub}>{monthPresent} de {MONTH_GOAL} treinos</Text>
        </View>

        {nextTraining && (
          <View style={styles.nextTrainingCard}>
            <Text style={styles.nextTrainingLabel}>Próximo treino</Text>
            <Text style={styles.nextTrainingValue}>
              {DAY_LABELS[nextTraining.getDay()]}, {nextTraining.getDate()} de {MONTH_NAMES[nextTraining.getMonth()]}
              {'  '}
              <Text style={styles.nextTrainingDiff}>
                {nextDiff === 1 ? 'amanhã' : `em ${nextDiff} dias`}
              </Text>
            </Text>
          </View>
        )}

        <View style={[styles.nextTrainingCard, daysLeft <= 7 && styles.cardWarning]}>
          <Text style={styles.nextTrainingLabel}>Mensalidade · {plan?.name}</Text>
          <Text style={styles.nextTrainingValue}>
            {daysLeft > 0 ? `Vence em ` : 'Vencida há '}
            <Text style={[styles.nextTrainingDiff, daysLeft <= 7 && { color: '#ff6b00' }]}>
              {Math.abs(daysLeft)} dia{Math.abs(daysLeft) !== 1 ? 's' : ''}
            </Text>
            {daysLeft > 0 ? ` · ${plan?.expires}` : ''}
            {daysLeft <= 7 ? '' : ''}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Treinos da semana</Text>
        <Text style={styles.sectionHint}>Toque em um dia de treino para detalhes</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const isTraining = trainingDays.includes(day.getDay())
            const isToday    = toDateStr(day) === todayStr
            const dateStr    = toDateStr(day)
            const st         = checkins[dateStr]

            return (
              <TouchableOpacity
                key={dateStr}
                activeOpacity={isTraining ? 0.7 : 1}
                onPress={() => isTraining && openDay(day)}
                style={[
                  styles.dayBox,
                  isTraining && styles.dayBoxTraining,
                  isToday && styles.dayBoxToday,
                  st === 'present'   && styles.dayBoxPresent,
                  st === 'justified' && styles.dayBoxJustified,
                ]}
              >
                <Text style={[
                  styles.dayLabel,
                  isTraining && styles.dayLabelTraining,
                  isToday && { color: '#000' },
                  st === 'present' && { color: '#fff' },
                  st === 'justified' && { color: '#fff' },
                ]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday, st === 'present' && { color: '#fff' }, st === 'justified' && { color: '#fff' }]}>
                  {day.getDate()}
                </Text>
                {isTraining && (
                  st === 'present'   ? <Text style={[styles.statusIcon, { color: '#4caf50' }]}>✓</Text>  :
                  st === 'justified' ? <Text style={[styles.statusIcon, { color: '#888' }]}>F</Text> :
                  isToday            ? <View style={styles.trainingDotYellow} />  :
                  dateStr < todayStr ? <Text style={[styles.statusIcon, { color: '#ff4d4d' }]}>F</Text> :
                                       <View style={styles.trainingDot} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.sectionTitle}>Campeonatos próximos</Text>
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

      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                        <Text style={styles.modalInfoLabel}>Horário</Text>
                        <Text style={styles.modalInfoValue}>19h00 – 21h00</Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Local</Text>
                        <Text style={styles.modalInfoValue}>Quadra Principal</Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Status</Text>
                        <Text style={[styles.modalInfoValue,
                          status === 'present'   && { color: '#4caf50' },
                          status === 'justified' && { color: '#888' },
                          !status && selectedDay.isPast && !selectedDay.isToday && { color: '#ff4d4d' },
                          !status && { color: '#888' },
                        ]}>
                          {status === 'present'   ? '✓ Presença confirmada' :
                           status === 'justified' ? 'Falta justificada'  :
                           selectedDay.isPast && !selectedDay.isToday ? 'Falta sem justificativa' :
                           'Sem registro'}
                        </Text>
                      </View>

                      {status === 'justified' && justifs[selectedDay.dateStr] && (
                        <View style={styles.justifBox}>
                          <Text style={styles.justifLabel}>Justificativa:</Text>
                          <Text style={styles.justifText}>{justifs[selectedDay.dateStr]}</Text>
                        </View>
                      )}

                      {status === 'present' && selectedDay.isToday && (
                        <TouchableOpacity
                          style={styles.btnCancel}
                          onPress={() => handleCancelEntry(selectedDay.dateStr)}
                        >
                          <Text style={styles.btnCancelText}>✕ Cancelar check-in</Text>
                        </TouchableOpacity>
                      )}

                      {status === 'justified' && (
                        <TouchableOpacity
                          style={styles.btnCancel}
                          onPress={() => handleCancelEntry(selectedDay.dateStr)}
                        >
                          <Text style={styles.btnCancelText}>✕ Cancelar justificativa</Text>
                        </TouchableOpacity>
                      )}

                      {!status && selectedDay.isToday && (
                        <View style={styles.modalActions}>
                          <TouchableOpacity
                            style={[styles.btnCheckin, justifyText.trim() && { opacity: 0.3 }]}
                            onPress={() => handleCheckin(selectedDay.dateStr)}
                            disabled={!!loadingCheckin || !!justifyText.trim()}
                          >
                            {loadingCheckin === selectedDay.dateStr
                              ? <ActivityIndicator color="#000" />
                              : <Text style={styles.btnCheckinText}>✓ Fazer Check-in</Text>}
                          </TouchableOpacity>

                          <Text style={styles.justifTitle}>Justificar falta</Text>
                          <TextInput
                            style={styles.justifInput}
                            placeholder="Motivo da falta..."
                            placeholderTextColor="#555"
                            value={justifyText}
                            onChangeText={setJustifyText}
                            multiline
                            blurOnSubmit
                          />
                          {justifyText.trim() ? (
                            <View style={styles.justifBtnRow}>
                              <TouchableOpacity
                                style={styles.btnCancelJustif}
                                onPress={() => { setJustifyText(''); Keyboard.dismiss() }}
                              >
                                <Text style={styles.btnCancelJustifText}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.btnJustify, { flex: 1 }]}
                                onPress={handleJustify}
                                disabled={justifyLoading}
                              >
                                {justifyLoading
                                  ? <ActivityIndicator color="#FFD600" />
                                  : <Text style={styles.btnJustifyText}>Enviar</Text>}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.btnJustify, { opacity: 0.4 }]}
                              disabled
                            >
                              <Text style={styles.btnJustifyText}>Enviar justificativa</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {!status && selectedDay.isPast && !selectedDay.isToday && (
                        <View style={styles.blockedCard}>
                          <Text style={styles.blockedText}>Check-in não disponível para dias anteriores.</Text>
                        </View>
                      )}

                    </>
                  )}

                  <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
                    <Text style={styles.modalCloseText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
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

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 14, padding: 14, gap: 4 },
  statBoxWarning: { borderWidth: 1, borderColor: '#ff6b00' },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FFD600', lineHeight: 32 },
  statGoal: { fontSize: 16, color: '#555', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#666' },
  statSub: { fontSize: 11, color: '#555' },
  progressBg: { height: 5, backgroundColor: '#2a2a2a', borderRadius: 3, marginTop: 6 },
  progressFill: { height: 5, backgroundColor: '#FFD600', borderRadius: 3 },
  progressHint: { fontSize: 10, color: '#888', marginTop: 4 },
  warningBadge: { fontSize: 11, color: '#ff6b00', marginTop: 4, fontWeight: 'bold' },

  monthCard: {
    backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FFD600',
  },
  monthCardText: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  progressBg: { height: 5, backgroundColor: '#2a2a2a', borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: '#FFD600', borderRadius: 3 },
  progressSub: { fontSize: 11, color: '#555', marginTop: 6 },
  cardWarning: { borderLeftColor: '#ff6b00' },

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
  dayBoxJustified: { backgroundColor: '#2a2a2a', borderColor: '#444', borderWidth: 1},
  dayLabel: { fontSize: 10, color: '#666' },
  dayLabelTraining: { color: '#aaa' },
  dayNum: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  dayNumToday: { color: '#000' },
  trainingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#444' },
  trainingDotYellow: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#000' },
  statusIcon: { fontSize: 12, color: '#aaa', fontWeight: 'bold' },

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
  justifBox: { backgroundColor: '#111', borderRadius: 10, padding: 12 },
  justifLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  justifText: { color: '#ccc', fontSize: 13 },
  modalActions: { gap: 10, marginTop: 4 },
  btnCheckin: { backgroundColor: '#FFD600', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnCheckinText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  justifTitle: { color: '#888', fontSize: 12, marginTop: 4 },
  justifInput: { backgroundColor: '#111', color: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#333', minHeight: 70, textAlignVertical: 'top' },
  justifBtnRow: { flexDirection: 'row', gap: 8 },
  btnCancelJustif: { borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  btnCancelJustifText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  btnJustify: { borderWidth: 1, borderColor: '#FFD600', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnJustifyText: { color: '#FFD600', fontWeight: 'bold', fontSize: 14 },
  btnCancel: { borderWidth: 1, borderColor: '#ff4d4d', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnCancelText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 14 },
  blockedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ff4d4d',
    padding: 12,
    marginTop: 4,
  },
  blockedText: { color: '#888', fontSize: 13 },
  modalClose: { marginTop: 4, alignItems: 'center', paddingVertical: 10 },

  modalCloseText:{color:'white'}
})
