import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth.store'
import { useLanguageStore } from '../store/language.store'
import api from '../lib/api'
import type { Order, PaginatedResponse } from '../types/api'

const STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

const STEP_LABELS: Record<string, Record<string, string>> = {
  en: {
    PENDING: 'Placed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  },
  ru: {
    PENDING: 'Оформлен',
    PROCESSING: 'Обработка',
    SHIPPED: 'Отправлен',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменён',
  },
  tg: {
    PENDING: 'Қабул',
    PROCESSING: 'Коркард',
    SHIPPED: 'Фиристода',
    DELIVERED: 'Расид',
    CANCELLED: 'Бекор',
  },
}

const TITLES: Record<string, string> = { en: 'My Orders', ru: 'Мои заказы', tg: 'Фармоишҳоям' }
const EMPTY: Record<string, string> = {
  en: 'No orders yet',
  ru: 'Заказов пока нет',
  tg: 'Ҳоло фармоише нест',
}

function OrderTracker({ status }: { status: string }) {
  const { locale } = useLanguageStore()
  const labels = STEP_LABELS[locale] ?? STEP_LABELS.en

  if (status === 'CANCELLED') {
    return (
      <View style={[tracker.row, { backgroundColor: '#fef2f2', borderRadius: 8, padding: 8 }]}>
        <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 12 }}>
          ✕ {labels.CANCELLED}
        </Text>
      </View>
    )
  }

  const activeIndex = STEPS.findIndex((step) => step === status)

  return (
    <View style={tracker.container}>
      {STEPS.map((step, i) => {
        const done = i <= activeIndex
        const active = i === activeIndex
        return (
          <View key={step} style={tracker.stepWrap}>
            {i > 0 && (
              <View style={[tracker.line, done && i <= activeIndex ? tracker.lineActive : {}]} />
            )}
            <View
              style={[
                tracker.dot,
                done ? tracker.dotDone : tracker.dotEmpty,
                active && tracker.dotActive,
              ]}
            >
              {done && !active && <Text style={{ color: '#6366f1', fontSize: 8 }}>✓</Text>}
            </View>
            <Text
              style={[tracker.label, done ? tracker.labelDone : tracker.labelEmpty]}
              numberOfLines={1}
            >
              {labels[step]}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function OrdersScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { locale } = useLanguageStore()

  const { data, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/orders?limit=50')
      return data
    },
    enabled: !!user,
  })

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          {locale === 'ru'
            ? 'Войдите, чтобы видеть заказы'
            : locale === 'tg'
              ? 'Ворид шавед'
              : 'Sign in to see orders'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.btnText}>
            {locale === 'ru' ? 'Войти' : locale === 'tg' ? 'Даромадан' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{TITLES[locale] ?? TITLES.en}</Text>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />}

      {!isLoading && !data?.data?.length && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{EMPTY[locale] ?? EMPTY.en}</Text>
        </View>
      )}

      <View style={styles.list}>
        {data?.data?.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.amount}>${Number(order.totalAmount).toFixed(2)}</Text>
            </View>
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</Text>

            <OrderTracker status={order.status} />

            <Text style={styles.items} numberOfLines={2}>
              {order.items?.map((item) => item.productName).join(', ')}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const tracker = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  stepWrap: { flex: 1, alignItems: 'center', position: 'relative' },
  line: {
    position: 'absolute',
    top: 8,
    left: '-50%',
    right: '50%',
    height: 2,
    backgroundColor: '#e5e7eb',
    zIndex: 0,
  },
  lineActive: { backgroundColor: '#6366f1' },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotEmpty: { borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  dotDone: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  dotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  labelDone: { color: '#4338ca', fontWeight: '600' },
  labelEmpty: { color: '#9ca3af' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { marginRight: 12 },
  backText: { fontSize: 28, color: '#6366f1', lineHeight: 32 },
  title: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyText: { color: '#6b7280', fontSize: 15, marginBottom: 16 },
  btn: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  list: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 14, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold', fontSize: 15 },
  amount: { fontWeight: 'bold', color: '#6366f1', fontSize: 15 },
  date: { color: '#9ca3af', fontSize: 12 },
  items: { color: '#6b7280', fontSize: 12, marginTop: 2 },
})
