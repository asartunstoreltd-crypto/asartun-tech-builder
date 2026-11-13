import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase.js'
import { missions as staticList } from '../data/missions'
import { content as staticContent } from '../data/registry'
import { loadPublished } from './missionStore.js'

// Learner missions. Supabase configured: ONLY what the database says is published (the admin's choice).
// Supabase not configured, or unreachable: the built-in missions, so the app still works offline.
export function useMissions() {
  const [s, setS] = useState(isSupabaseConfigured
    ? { list: [], content: {}, loading: true }
    : { list: staticList, content: staticContent, loading: false })
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let live = true
    loadPublished(supabase)
      .then((r) => { if (live) setS({ ...r, loading: false }) })
      .catch(() => { if (live) setS({ list: staticList, content: staticContent, loading: false }) })
    return () => { live = false }
  }, [])
  return s
}
