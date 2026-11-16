import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase.js'

// A third client with its own storage key: an adult learner signed in on a shared phone never replaces
// (or is replaced by) a child's session or an admin session. Facilitators reuse the existing staff client (supabaseAdmin).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabaseAdult = isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'atb-adult-auth' } })
  : null
export const supabaseStaff = supabaseAdmin
export { isSupabaseConfigured }
