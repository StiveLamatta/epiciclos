import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zpmtxclowknmtcvdtsgv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbXR4Y2xvd2tubXRjdmR0c2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDYwNDMsImV4cCI6MjA5ODgyMjA0M30._Bq2tvSVOopoRbLa3m-Ikl7yO-v7Or7Xy7LdmjPpByY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
