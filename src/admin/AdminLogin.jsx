import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { useAdminAuth } from './AdminAuth.jsx'

export default function AdminLogin() {
  const { session, isAdmin, signIn } = useAdminAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (session && isAdmin) return <Navigate to="/admin/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const msg = await signIn(email.trim(), password)
    setBusy(false)
    if (msg) setErr(msg); else nav('/admin/dashboard', { replace: true })
  }

  return (
    <div className="adm-center">
      <form className="adm-card" onSubmit={submit}>
        <div className="adm-logo">🛠️</div>
        <h1>ASARTUN TECH BUILDER</h1>
        <p className="adm-sub">Admin Control Panel</p>
        {!isSupabaseConfigured && <p className="adm-err">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.</p>}
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="adm-err" role="alert">{err}</p>}
        <button className="adm-btn" disabled={busy || !isSupabaseConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="adm-foot">© ASARTUN STORE LIMITED</p>
      </form>
    </div>
  )
}
