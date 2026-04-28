import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await api.get(`/products/${id}`); return data },
  })

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart/items', { productId: id, quantity: 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); Alert.alert('Added!', 'Item added to cart') },
    onError: () => Alert.alert('Error', 'Could not add to cart'),
  })

  if (isLoading || !product) return (
    <View style={styles.center}><Text>Loading…</Text></View>
  )

  const price = Number(product.discountPrice ?? product.price)
  const mainImage = product.images?.[0]?.url

  return (
    <ScrollView style={styles.container}>
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}

      <View style={styles.body}>
        <Text style={styles.category}>{product.category?.name}</Text>
        <Text style={styles.name}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>by {product.brand}</Text>}

        <View style={styles.priceRow}>
          <Text style={styles.price}>${price.toFixed(2)}</Text>
          {product.discountPrice && (
            <Text style={styles.originalPrice}>${Number(product.price).toFixed(2)}</Text>
          )}
        </View>

        {product.description && (
          <Text style={styles.desc}>{product.description}</Text>
        )}

        <View style={styles.stockRow}>
          <View style={[styles.dot, { backgroundColor: product.stock > 0 ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.stock}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</Text>
        </View>

        {product.avgRating && (
          <Text style={styles.rating}>⭐ {product.avgRating.toFixed(1)} ({product.reviewCount} reviews)</Text>
        )}

        {product.tags?.length > 0 && (
          <View style={styles.tags}>
            {product.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, product.stock === 0 && styles.btnDisabled]}
          disabled={product.stock === 0 || addToCart.isPending}
          onPress={() => addToCart.mutate()}
        >
          <Text style={styles.btnText}>{addToCart.isPending ? 'Adding…' : 'Add to Cart'}</Text>
        </TouchableOpacity>

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <View style={styles.reviews}>
            <Text style={styles.reviewsTitle}>Reviews</Text>
            {product.reviews.map((r: any) => (
              <View key={r.id} style={styles.reviewCard}>
                <Text style={styles.reviewer}>{r.user.fullName}</Text>
                <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 320 },
  placeholder: { backgroundColor: '#f3f4f6' },
  body: { padding: 20, gap: 12 },
  category: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  brand: { fontSize: 13, color: '#6b7280' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#6366f1' },
  originalPrice: { fontSize: 18, color: '#9ca3af', textDecorationLine: 'line-through' },
  desc: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stock: { fontSize: 14, color: '#374151' },
  rating: { fontSize: 14, color: '#374151' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#374151' },
  btn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  reviews: { marginTop: 16 },
  reviewsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  reviewCard: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8, gap: 4 },
  reviewer: { fontWeight: '600', fontSize: 14 },
  reviewRating: { fontSize: 14 },
  reviewComment: { fontSize: 13, color: '#4b5563' },
})
