import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

export default function CartTab() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const { data } = await api.get('/cart'); return data },
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => api.delete(`/cart/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/cart/items/${id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  if (!cart?.items?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.btnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Cart ({cart.items.length})</Text></View>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {item.product.images?.[0] ? (
              <Image source={{ uri: item.product.images[0].url }} style={styles.img} resizeMode="cover" />
            ) : (
              <View style={[styles.img, { backgroundColor: '#f3f4f6' }]} />
            )}
            <View style={styles.itemBody}>
              <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>${Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price).toFixed(2)}</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem.mutate(item.id)} style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${Number(cart.total).toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  btn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  img: { width: 80, height: 80, borderRadius: 8 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#6366f1', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: '#374151' },
  qty: { fontSize: 15, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#6366f1' },
  checkoutBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
