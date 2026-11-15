import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase.js'
import { missions as staticList } from '../data/missions'
import { content as staticContent } from '../data/registry'
import { loadPublished } from './missionStore.js'
import { ensureSession } from './learnerSync.js'

// Learner missions.
// - Supabase NOT configured (demo / offline build): the built-in missions.
// - Supabase configured: ONLY what the database allows this learner to open (published, and premium only if paid).
//   There is deliberately NO fall-back to the built-in missions, otherwise blocking the network would bypass the premium lock.
//   If the phone is offline, the last copy this same learner downloaded (max 7 days old) is used.
const CACHE = 'atb-mcache'
const WEEK = 7 * 24 * 3600 * 1000
const readCache = () => {
  try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); return c && Date.now() - c.at < WEEK ? c : null } catch { return null }
}

export function useMissions() {
  const [s, setS] = useState(isSupabaseConfigured
    ? { list: [], content: {}, loading: true, offline: false }
    : { list: staticList, content: staticContent, loading: false, offline: false })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let live = true
    ensureSession()
      .then(() => loadPublished(supabase))
      .then((r) => {
        try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), list: r.list, content: r.content })) } catch { /* too big or blocked: ignore */ }
        if (live) setS({ ...r, loading: false, offline: false })
      })
      .catch(() => {
        if (!live) return
        const c = readCache()
        setS((x) => (x.list.length ? { ...x, loading: false, offline: true } : c ? { list: c.list, content: c.content, loading: false, offline: true } : { list: [], content: {}, loading: false, offline: true }))
      })
    return () => { live = false }
  }, [tick])
  const refresh = useCallback(() => setTick((n) => n + 1), [])
  return { ...s, refresh }
}
