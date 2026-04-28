import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../../store/auth.store'
import api from '../../lib/api'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const router = useRouter()

  const login = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      await SecureStore.setItemAsync('access_token', data.accessToken)
      setAuth(data.user, data.accessToken)
      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ShopTaj</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Sign in to your account</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={login} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>Don't have an account? <Text style={{ color: '#6366f1' }}>Sign up</Text></Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff', gap: 12 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#6366f1', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  sub: { color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: '#6b7280', marginTop: 4 },
})
