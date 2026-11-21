import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { useDash } from './DashAuth.jsx'

// Shown IN PLACE at whatever /dashboard address was opened, so deep links survive signing in and nothing redirects.
export default function Login() {
  const { signIn } = useDash()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(''); const m = await signIn(email.trim(), pw); setBusy(false); if (m) setErr(m) }
  return (
    <div className="dash-center">
      <form className="dash-card login" onSubmit={go}>
        <div className="dash-logo" aria-hidden="true">🛠️</div>
        <h1>ASARTUN Dashboard</h1>
        <p className="dash-muted">Sign in with your staff account.</p>
        {!isSupabaseConfigured && <p className="dash-err" role="alert">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>}
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {err && <p className="dash-err" role="alert">{err}</p>}
        <button className="dash-btn primary" disabled={busy || !isSupabaseConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
