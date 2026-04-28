import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import api from '../../lib/api'

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const register = async () => {
    if (!fullName || !email || !password) { Alert.alert('Error', 'Please fill all fields'); return }
    if (password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/register', { fullName, email, password })
      Alert.alert('Success', 'Account created! Please check your email to verify.', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }])
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>ShopTaj</Text>
      <Text style={styles.title}>Create account</Text>
      <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password (min 8 characters)" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={register} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>Already have an account? <Text style={{ color: '#6366f1' }}>Sign in</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff', gap: 12 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#6366f1', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: '#6b7280', marginTop: 4 },
})
