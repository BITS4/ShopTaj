import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import api, { fixImageUrl } from '../../lib/api'

export default function SearchTab() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['search', search],
    queryFn: async () => {
      if (!search) return null
      const { data } = await api.get(`/products?search=${encodeURIComponent(search)}&limit=20`)
      return data
    },
    enabled: !!search,
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search products..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSearch(query)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => setSearch(query)}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />}

      {!search && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Search for products by name, brand, or category</Text>
        </View>
      )}

      {data && (
        <FlatList
          data={data.data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
          ListHeaderComponent={<Text style={styles.resultCount}>{data.meta.total} results</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${item.slug ?? item.id}`)}>
              {item.images?.[0] ? (
                <Image source={{ uri: fixImageUrl(item.images[0].url) }} style={styles.img} resizeMode="cover" />
              ) : (
                <View style={[styles.img, styles.placeholder]} />
              )}
              <View style={{ padding: 8 }}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.price}>${Number(item.discountPrice ?? item.price).toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No products found</Text> : null}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, backgroundColor: '#f9fafb' },
  searchBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  resultCount: { paddingHorizontal: 16, paddingTop: 12, color: '#6b7280', fontSize: 13, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#6b7280', textAlign: 'center', fontSize: 14 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  img: { width: '100%', aspectRatio: 1 },
  placeholder: { backgroundColor: '#f3f4f6' },
  name: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: '#6366f1' },
})
