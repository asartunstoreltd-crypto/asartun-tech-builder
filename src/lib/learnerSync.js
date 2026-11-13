import { supabase, isSupabaseConfigured } from './supabase.js'

// Learner <-> database. The app stays usable offline: progress is always saved on the device first,
// then sent to the database when possible. Points are decided by the database (award_progress), never by the browser.
const QUEUE = 'atb-pending'
const loadQ = () => { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]') } catch { return [] } }
const saveQ = (q) => { try { localStorage.setItem(QUEUE, JSON.stringify(q)) } catch { /* ignore */ } }

let sessionPromise = null
// Children never type an email or password: a private anonymous session is created on this device.
export function ensureSession() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) return data.session
        const r = await supabase.auth.signInAnonymously()
        return (r.data && r.data.session) || null
      } catch { return null }
    })().then((s) => { if (!s) sessionPromise = null; return s })
  }
  return sessionPromise
}

export async function startProfile(nick, ageBand) {
  const s = await ensureSession()
  if (!s) return false
  const { error } = await supabase.rpc('ensure_my_profile', { p_nickname: nick, p_age_band: ageBand || null })
  return !error
}

const transient = (e) => !e.code || ['42501', 'P0001', 'PGRST301'].includes(e.code)

export async function flush() {
  const s = await ensureSession()
  if (!s) return
  const rest = []
  for (const key of loadQ()) {
    const { error } = await supabase.rpc('award_progress', { p_event_key: key })
    if (error && transient(error)) rest.push(key)      // refused for good (unknown mission / rule): drop it
  }
  saveQ(rest)
}
export function sendEvent(key) {
  const q = loadQ()
  if (!q.includes(key)) { q.push(key); saveQ(q) }
  return flush()
}
// Existing learners: send progress they already earned on this device (the database pays each key once).
export function syncAll(keys) {
  const q = loadQ()
  keys.forEach((k) => { if (!q.includes(k)) q.push(k) })
  saveQ(q)
  return flush()
}
export async function logWrong(key) {
  try { if (await ensureSession()) await supabase.rpc('log_quiz_wrong', { p_event_key: key }) } catch { /* ignore */ }
}
export async function heartbeat() {
  try { if (await ensureSession()) await supabase.rpc('touch_active') } catch { /* ignore */ }
}

const rpc = async (fn, args) => {
  if (!(await ensureSession())) throw new Error('offline')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}
export const joinWithCode = (code) => rpc('join_with_code', { p_code: code })
export const myMemberships = () => rpc('my_memberships')
export const leaveOrg = (id) => rpc('leave_organization', { p_org: id })
export const deleteMyData = () => rpc('delete_my_data')
export async function signOutLearner() { try { await supabase.auth.signOut() } catch { /* ignore */ } sessionPromise = null }
