import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL' // Would normally come from env
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY' // Would normally come from env

// In a real scenario, this would use the real env vars. 
// For this demo, we'll initialize the client assuming mock/placeholder behavior if keys are missing.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
