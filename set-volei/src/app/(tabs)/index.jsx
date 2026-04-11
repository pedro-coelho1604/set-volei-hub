import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import BottomMenu from '../../components/BottomMenu'
import {
  userMock, planMock, trainingDaysMock,
  championshipsMock
} from '../../mocks/userMocks'
import { getCheckins, doCheckin } from '../home/storage/checkinStorage'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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

function getNextTraining() {
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (trainingDaysMock.includes(d.getDay())) return d
  }
  return null
}

function getDaysDiff(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24))
}

function getMonthCheckins(checkins) {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return checkins.filter(c => c.startsWith(prefix)).length
}

export default function Home() {
  const router = useRouter()
  const [checkins, setCheckins] = useState([])
  const [loadingCheckin, setLoadingCheckin] = useState(null)
  const weekDays = getWeekDays()
  const today = new Date()
  const daysLeft = daysUntil(planMock.expires)
  const firstName = userMock.name.split(' ')[0]
  const nextTraining = getNextTraining()
  const nextDiff = nextTraining ? getDaysDiff(new Date(nextTraining)) : null

  useEffect(() => {
    getCheckins().then(setCheckins)
  }, [])

  const monthCheckins = getMonthCheckins(checkins)
  const monthGoal = 8

  async function handleCheckin(dateStr) {
    setLoadingCheckin(dateStr)
    await doCheckin(dateStr)
    const updated = await getCheckins()
    setCheckins(updated)
    setLoadingCheckin(null)
  }

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
            <Image source={{ uri: userMock.avatar }} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{monthCheckins}/{monthGoal}</Text>
            <Text style={styles.statLabel}>Treinos no mês</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, daysLeft <= 7 && { color: '#ff6b00' }]}>
              {daysLeft}D
            </Text>
            <Text style={styles.statLabel}>Mensalidade</Text>
          </View>
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

        <Text style={styles.sectionTitle}>Treinos da semana</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const isTraining = trainingDaysMock.includes(day.getDay())
            const isToday = toDateStr(day) === toDateStr(today)
            const dateStr = toDateStr(day)
            const checked = checkins.includes(dateStr)
            const isLoading = loadingCheckin === dateStr

            return (
              <View key={dateStr} style={[
                styles.dayBox,
                isTraining && styles.dayBoxTraining,
                isToday && styles.dayBoxToday,
              ]}>
                <Text style={[styles.dayLabel, isTraining && styles.dayLabelTraining, isToday && { color: '#000' }]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                  {day.getDate()}
                </Text>
                {isTraining && (
                  checked ? (
                    <Text style={styles.checkedBadge}>✓</Text>
                  ) : isToday ? (
                    <TouchableOpacity style={styles.checkinBtn} onPress={() => handleCheckin(dateStr)} disabled={!!isLoading}>
                      {isLoading
                        ? <ActivityIndicator size={10} color="#000" />
                        : <Text style={styles.checkinBtnText}>Check-in</Text>}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.trainingDot} />
                  )
                )}
              </View>
            )
          })}
        </View>

        <Text style={styles.sectionTitle}>Campeonatos próximos</Text>
        {championshipsMock.map((c) => (
          <View key={c.id} style={styles.championCard}>
            <Text style={styles.championIcon}>{c.icon}</Text>
            <View style={styles.championInfo}>
              <Text style={styles.championName}>{c.name}</Text>
              <Text style={styles.championDetail}>{c.date}</Text>
              <Text style={styles.championDetail}>{c.location}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomMenu />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  date: { fontSize: 13, color: '#666', marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#FFD600' },

  quoteCard: {
    backgroundColor: '#1a1600', borderLeftWidth: 3, borderLeftColor: '#FFD600',
    borderRadius: 10, padding: 14, marginBottom: 20,
  },
  quoteText: { color: '#aaa', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#FFD600' },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center' },

  nextTrainingCard: {
    backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#FFD600',
  },
  nextTrainingLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  nextTrainingValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
  nextTrainingDiff: { color: '#FFD600', fontWeight: 'bold' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  dayBox: {
    flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2,
    borderRadius: 10, backgroundColor: '#1e1e1e', gap: 4, minHeight: 72,
  },
  dayBoxTraining: { backgroundColor: '#1a1600', borderWidth: 1, borderColor: '#FFD600' },
  dayBoxToday: { backgroundColor: '#FFD600' },
  dayLabel: { fontSize: 10, color: '#666' },
  dayLabelTraining: { color: '#FFD600' },
  dayNum: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  dayNumToday: { color: '#000' },
  trainingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD600' },
  checkinBtn: { backgroundColor: '#FFD600', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3 },
  checkinBtnText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
  checkedBadge: { fontSize: 14, color: '#4caf50', fontWeight: 'bold' },

  championCard: {
    flexDirection: 'row', backgroundColor: '#1e1e1e', borderRadius: 14,
    padding: 16, marginBottom: 12, alignItems: 'center', gap: 14,
  },
  championInfo: { flex: 1, gap: 3 },
  championName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  championDetail: { fontSize: 12, color: '#888' },
})
