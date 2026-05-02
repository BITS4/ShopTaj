import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import api, { fixImageUrl } from '../../lib/api'
import { useLanguageStore, LOCALES } from '../../store/language.store'

const LABELS = {
  en: { categories: 'Categories', products: 'All Products', subtitle: 'Discover amazing products' },
  ru: { categories: 'Категории', products: 'Все товары', subtitle: 'Открывайте новые товары' },
  tg: { categories: 'Категорияҳо', products: 'Ҳамаи молҳо', subtitle: 'Молҳои нав кашф кунед' },
}

function ProductCard({ product }: { product: any }) {
  const router = useRouter()
  const price = Number(product.discountPrice ?? product.price)
  const mainImage = fixImageUrl(product.images?.[0]?.url)

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${product.slug ?? product.id}`)}>
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
  const { locale, setLocale } = useLanguageStore()
  const L = LABELS[locale]

  const { data: featured, isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: async () => { const { data } = await api.get('/products?limit=12&sortBy=newest'); return data.data },
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
        <View style={styles.headerTop}>
          <Text style={styles.logo}>ShopTaj</Text>
          <View style={styles.langRow}>
            {LOCALES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langBtn, locale === l.key && styles.langBtnActive]}
                onPress={() => setLocale(l.key)}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.subtitle}>{L.subtitle}</Text>
      </View>

      {/* Categories */}
      {categories?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{L.categories}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {categories.map((cat: any) => (
              <TouchableOpacity key={cat.id} style={styles.catChip} onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: cat.id } })}>
                <Text style={styles.catChipText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{L.products}</Text>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#e0e7ff', marginTop: 4 },
  langRow: { flexDirection: 'row', gap: 6 },
  langBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  langBtnActive: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1.5, borderColor: '#fff' },
  langFlag: { fontSize: 16 },
  section: { marginBottom: 24, marginTop: 16 },
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
