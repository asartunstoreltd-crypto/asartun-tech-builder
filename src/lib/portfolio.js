import { supabase, isSupabaseConfigured } from './supabase.js'
import { ensureSession } from './learnerSync.js'

// The child's project portfolio. Always kept on the device first (works offline); sent to the database when possible.
// The database decides what is accepted (save_portfolio_entry); a child can only ever write their own entries.
const LOCAL = 'atb-portfolio'
const PEND = 'atb-portfolio-pending'
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d) } catch { return JSON.parse(d) } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full or blocked: ignore */ } }
const transient = (e) => !e.code || ['42501', 'P0001', 'PGRST301'].includes(e.code)

export const localEntries = () => Object.values(read(LOCAL, '{}')).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))

export async function flushPortfolio() {
  const s = await ensureSession()
  if (!s) return
  const rest = []
  for (const e of read(PEND, '[]')) {
    const { error } = await supabase.rpc('save_portfolio_entry', { p_mission: e.mission, p_key: e.key, p_kind: e.kind, p_content: e.content })
    if (error && transient(error)) rest.push(e)      // refused for good (not allowed / too large): drop it
  }
  write(PEND, rest)
}

export function savePortfolio(mission, key, kind, content) {
  const id = mission + ':' + key
  const all = read(LOCAL, '{}')
  all[id] = { mission, key, kind, content, updated_at: new Date().toISOString() }
  write(LOCAL, all)
  if (!isSupabaseConfigured) return Promise.resolve()
  const q = read(PEND, '[]').filter((e) => !(e.mission === mission && e.key === key))   // newest version wins
  q.push({ mission, key, kind, content })
  write(PEND, q)
  return flushPortfolio()
}

// The child's own entries and teacher feedback, from the database (null when offline or not configured).
export async function loadMyPortfolio() {
  if (!isSupabaseConfigured) return null
  const s = await ensureSession()
  if (!s) return null
  const { data, error } = await supabase.rpc('my_portfolio')
  return error ? null : data
}
