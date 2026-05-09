import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { Truck } from 'lucide-react-native'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    
    // For this demonstration, we'll bypass actual auth if keys aren't real,
    // but here is the actual Supabase Auth implementation:
    /*
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      Alert.alert('Login Failed', error.message)
      setLoading(false)
      return
    }
    */
    
    // Simulate network delay for demo
    setTimeout(() => {
      setLoading(false)
      router.replace('/dashboard')
    }, 1000)
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Truck color="#10b981" size={64} />
        <Text style={styles.logoText}>CargoNode</Text>
        <Text style={styles.subtitle}>Driver Portal</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Driver ID (Email)"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>AUTHENTICATE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 16,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
})
