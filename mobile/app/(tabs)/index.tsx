import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

function ProductCard({ product }: { product: any }) {
  const router = useRouter()
  const price = Number(product.discountPrice ?? product.price)
  const mainImage = product.images?.[0]?.url

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${product.id}`)}>
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>No image</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory} numberOfLines={1}>{product.category?.name}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.cardPrice}>${price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HomeTab() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: async () => { const { data } = await api.get('/products/featured'); return data },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  const router = useRouter()

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>ShopTaj</Text>
        <Text style={styles.subtitle}>Discover amazing products</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>New Season Arrivals</Text>
        <Text style={styles.heroSub}>Up to 40% off selected items</Text>
        <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.heroBtnText}>Shop Now</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {categories?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {categories.map((cat: any) => (
              <TouchableOpacity key={cat.id} style={styles.catChip} onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: cat.id } })}>
                <Text style={styles.catChipText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#6366f1" />
        ) : (
          <FlatList
            data={featured}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
            renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard product={item} /></View>}
          />
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, paddingTop: 56, backgroundColor: '#6366f1' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#e0e7ff', marginTop: 2 },
  hero: { margin: 16, padding: 20, backgroundColor: '#f0f0ff', borderRadius: 16 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e1b4b' },
  heroSub: { color: '#6366f1', marginTop: 4, marginBottom: 16 },
  heroBtn: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, alignSelf: 'flex-start' },
  heroBtnText: { color: '#fff', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 12 },
  catChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  catChipText: { fontSize: 13, color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  cardImage: { width: '100%', aspectRatio: 1 },
  cardBody: { padding: 10 },
  cardCategory: { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: '#6366f1' },
})
