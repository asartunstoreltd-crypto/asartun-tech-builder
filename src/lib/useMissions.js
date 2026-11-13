import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase.js'
import { missions as staticList } from '../data/missions'
import { content as staticContent } from '../data/registry'
import { loadPublished } from './missionStore.js'
import { ensureSession } from './learnerSync.js'

// Learner missions. Supabase configured: ONLY what the database says is published (and what this learner may open).
// Supabase not configured, or unreachable: the built-in missions, so the app still works offline.
export function useMissions() {
  const [s, setS] = useState(isSupabaseConfigured
    ? { list: [], content: {}, loading: true }
    : { list: staticList, content: staticContent, loading: false })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let live = true
    ensureSession()
      .then(() => loadPublished(supabase))
      .then((r) => { if (live) setS({ ...r, loading: false }) })
      .catch(() => { if (live) setS((x) => (x.list.length ? { ...x, loading: false } : { list: staticList, content: staticContent, loading: false })) })
    return () => { live = false }
  }, [tick])
  const refresh = useCallback(() => setTick((n) => n + 1), [])
  return { ...s, refresh }
}
