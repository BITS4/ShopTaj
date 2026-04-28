import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../../store/auth.store'
import api from '../../lib/api'

export default function ProfileTab() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await api.get('/orders?limit=5'); return data },
    enabled: !!user,
  })

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    await SecureStore.deleteItemAsync('access_token')
    clearAuth()
    router.replace('/(auth)/login')
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign In to Continue</Text>
        <Text style={styles.sub}>Access your orders, wishlist, and more</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.btnText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.btnOutlineText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.fullName[0]}</Text>
        </View>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem label="My Orders" onPress={() => router.push('/orders')} />
        <MenuItem label="Wishlist" onPress={() => router.push('/wishlist')} />
        <MenuItem label="Saved Addresses" onPress={() => router.push('/addresses')} />
        <MenuItem label="Edit Profile" onPress={() => router.push('/edit-profile')} />
      </View>

      {orders?.data?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.data.slice(0, 3).map((order: any) => (
            <TouchableOpacity key={order.id} style={styles.orderRow} onPress={() => router.push(`/order/${order.id}`)}>
              <View>
                <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>${Number(order.totalAmount).toFixed(2)}</Text>
                <View style={[styles.badge, { backgroundColor: order.status === 'DELIVERED' ? '#d1fae5' : '#e0e7ff' }]}>
                  <Text style={{ fontSize: 11, color: order.status === 'DELIVERED' ? '#065f46' : '#4338ca' }}>{order.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Logout', onPress: logout, style: 'destructive' }])}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 22, fontWeight: 'bold' },
  sub: { color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnOutline: { borderWidth: 1.5, borderColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, width: '100%', alignItems: 'center' },
  btnOutlineText: { color: '#6366f1', fontWeight: 'bold', fontSize: 16 },
  header: { paddingTop: 60, paddingBottom: 24, alignItems: 'center', backgroundColor: '#f5f3ff', gap: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold' },
  email: { color: '#6b7280', fontSize: 14 },
  menu: { marginTop: 16, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuLabel: { fontSize: 15, color: '#111827' },
  menuArrow: { fontSize: 20, color: '#9ca3af' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  orderId: { fontWeight: '600', fontSize: 14 },
  orderDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontWeight: 'bold', color: '#6366f1' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  logoutBtn: { margin: 16, padding: 16, borderRadius: 10, borderWidth: 1.5, borderColor: '#ef4444', alignItems: 'center', marginBottom: 40 },
  logoutText: { color: '#ef4444', fontWeight: '600' },
})
