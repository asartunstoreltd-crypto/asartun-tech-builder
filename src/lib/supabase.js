import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && key)

// Two clients with separate storage keys: an admin signed in on this browser never
// replaces (or is replaced by) a child's anonymous learner session.
const make = (storageKey) => isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey } })
  : null

export const supabase = make('atb-learner-auth')        // learner app (anonymous sign-in, phase 2)
export const supabaseAdmin = make('atb-admin-auth')     // admin panel (email + password)
