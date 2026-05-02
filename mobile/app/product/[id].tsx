import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native'
import { useState, useRef } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { fixImageUrl } from '../../lib/api'
import { useAuthStore } from '../../store/auth.store'

const SCREEN_WIDTH = Dimensions.get('window').width

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const router = useRouter()
  const { user } = useAuthStore()
  const [activeImg, setActiveImg] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await api.get(`/products/${id}`); return data },
  })

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart/items', { productId: product?.id, quantity: 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); Alert.alert('Added!', 'Item added to cart') },
    onError: () => Alert.alert('Sign in required', 'Please sign in to add items to cart'),
  })

  if (isLoading || !product) return (
    <View style={styles.center}><Text>Loading…</Text></View>
  )

  const price = Number(product.discountPrice ?? product.price)
  const images: any[] = product.images ?? []
  const discountPct = product.discountPrice
    ? Math.round((1 - Number(product.discountPrice) / Number(product.price)) * 100)
    : null

  const onScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setActiveImg(index)
  }

  const goToImage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true })
    setActiveImg(index)
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image carousel */}
      <View style={styles.carouselWrapper}>
        {images.length > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={16}
          >
            {images.map((img: any, i: number) => (
              <Image
                key={img.id ?? i}
                source={{ uri: fixImageUrl(img.url) }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.carouselImage, styles.placeholder]} />
        )}

        {/* Image counter badge */}
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{activeImg + 1} / {images.length}</Text>
          </View>
        )}

        {/* Discount badge */}
        {discountPct && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discountPct}% OFF</Text>
          </View>
        )}
      </View>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbStrip}
        >
          {images.map((img: any, i: number) => (
            <TouchableOpacity key={img.id ?? i} onPress={() => goToImage(i)}>
              <Image
                source={{ uri: fixImageUrl(img.url) }}
                style={[styles.thumb, i === activeImg && styles.thumbActive]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_: any, i: number) => (
            <TouchableOpacity key={i} onPress={() => goToImage(i)}>
              <View style={[styles.dot, i === activeImg && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
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
          <View style={[styles.stockDot, { backgroundColor: product.stock > 0 ? '#22c55e' : '#ef4444' }]} />
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
          onPress={() => {
            if (!user) { router.push('/(auth)/login'); return }
            addToCart.mutate()
          }}
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

  carouselWrapper: { position: 'relative' },
  carouselImage: { width: SCREEN_WIDTH, height: 340 },
  placeholder: { backgroundColor: '#f3f4f6' },

  counter: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  discountBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#ef4444', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  discountBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  thumbStrip: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#6366f1' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { width: 18, backgroundColor: '#6366f1' },

  body: { padding: 20, gap: 12 },
  category: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  brand: { fontSize: 13, color: '#6b7280' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#6366f1' },
  originalPrice: { fontSize: 18, color: '#9ca3af', textDecorationLine: 'line-through' },
  desc: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
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
