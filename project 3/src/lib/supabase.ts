import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qwntpqrpvxzcstmpdlvk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bnRwcXJwdnh6Y3N0bXBkbHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDEyNDEsImV4cCI6MjA3NjM3NzI0MX0.4PRf07KU6vGpZWBVylhsyafPa9WsAvynjuFeVwAj_jw'

export const supabase = createClient(supabaseUrl, supabaseKey)
