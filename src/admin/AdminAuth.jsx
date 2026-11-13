import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseAdmin } from '../lib/supabase.js'

// UI convenience only. Real enforcement is Row Level Security + role checks in the database:
// even if someone edits this file in their browser, the database still refuses their requests.
const Ctx = createContext(null)
export const useAdminAuth = () => useContext(Ctx)

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [roles, setRoles] = useState([])
  const [status, setStatus] = useState('loading') // loading | signedOut | ready

  useEffect(() => {
    if (!supabaseAdmin) { setStatus('signedOut'); return }
    supabaseAdmin.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setStatus('signedOut')
    })
    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setRoles([]); setStatus('signedOut') }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load this user's roles (RLS only returns the caller's own rows, or all rows for a Super Admin).
  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) return
    let live = true
    setStatus('loading')
    supabaseAdmin.from('admin_roles').select('role').eq('user_id', uid).then(({ data, error }) => {
      if (!live) return
      setRoles(error ? [] : (data ?? []).map((r) => r.role))
      setStatus('ready')
    })
    return () => { live = false }
  }, [uid])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    return error ? 'Sign-in failed. Check your email and password.' : null   // deliberately generic
  }, [])
  const signOut = useCallback(() => supabaseAdmin.auth.signOut(), [])

  const value = useMemo(() => ({
    session, roles, status, signIn, signOut,
    isAdmin: roles.length > 0,
    hasRole: (...allowed) => roles.includes('super_admin') || allowed.some((r) => roles.includes(r)),
  }), [session, roles, status, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
