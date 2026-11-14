import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from '../admin/AdminAuth.jsx'
import { OrgClasses, OrgInsights, OrgLearners } from '../admin/orgparts.jsx'
import { staffOrgs } from '../admin/api2.js'
import { isSupabaseConfigured, supabaseAdmin } from '../lib/supabase.js'
import '../admin/admin.css'

// Portal for a school or company (/org). Staff see ONLY their own learners; the database enforces it.
function OrgLogin() {
  const { session, signIn } = useAdminAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/org" replace />
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const msg = await signIn(email.trim(), password)
    setBusy(false)
    if (msg) setErr(msg); else nav('/org', { replace: true })
  }
  return (
    <div className="adm-center">
      <form className="adm-card" onSubmit={submit}>
        <div className="adm-logo">🏫</div>
        <h1>ASARTUN TECH BUILDER</h1>
        <p className="adm-sub">School &amp; Company Portal</p>
        {!isSupabaseConfigured && <p className="adm-err">Supabase is not configured.</p>}
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="adm-err" role="alert">{err}</p>}
        <button className="adm-btn" disabled={busy || !isSupabaseConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

function ChangePassword({ onClose }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (a.length < 10) return setMsg({ err: 'Use at least 10 characters.' })
    if (a !== b) return setMsg({ err: 'The two passwords are not the same.' })
    setBusy(true)
    const { error } = await supabaseAdmin.auth.updateUser({ password: a })
    setBusy(false)
    setMsg(error ? { err: 'Could not change the password. Sign in again and retry.' } : { ok: 'Password changed.' })
  }
  return (
    <div className="adm-modal"><form className="adm-card" onSubmit={submit}>
      <h3>Change password</h3>
      <label className="adm-f"><span>New password (10+ characters)</span><input type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} /></label>
      <label className="adm-f"><span>Repeat it</span><input type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} /></label>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      <div className="adm-actions"><button className="adm-btn" disabled={busy}>Save</button><button type="button" className="adm-btn ghost" onClick={onClose}>Close</button></div>
    </form></div>
  )
}

function OrgHome() {
  const { session, status, signOut } = useAdminAuth()
  const [orgs, setOrgs] = useState(null)
  const [sel, setSel] = useState('')
  const [tab, setTab] = useState('learners')
  const [err, setErr] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  useEffect(() => {
    if (!session) return
    staffOrgs().then((r) => { setOrgs(r); if (r.length) setSel(r[0].id) }).catch((e) => setErr(e.message))
  }, [session])
  if (status === 'loading') return <p className="adm-main">Loading…</p>
  if (!session) return <Navigate to="/org/login" replace />
  const org = orgs && orgs.find((o) => o.id === sel)
  return (
    <div className="adm">
      <header className="adm-top">
        <div><b>🏫 ASARTUN TECH BUILDER</b> <span className="adm-sub">School &amp; Company Portal</span></div>
        <div className="adm-user"><span className="adm-mail">{session.user.email}</span><button className="adm-btn ghost" onClick={() => setPwOpen(true)}>Change password</button><button className="adm-btn ghost" onClick={signOut}>Sign out</button></div>
      </header>
      <main className="adm-main">
        {err && <p className="adm-err">{err}</p>}
        {orgs && orgs.length === 0 && <p className="adm-warn">This account is not linked to any school or company. Ask ASARTUN STORE LIMITED to add you.</p>}
        {org && (
          <>
            <div className="adm-head">
              <h2>{org.name}</h2>
              {orgs.length > 1 && <select value={sel} onChange={(e) => setSel(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
            </div>
            {org.join_code && <p>Organization code: <code className="adm-code">{org.join_code}</code> <span className="adm-note">(children can also use a class code)</span></p>}
            <div className="adm-tabs">{[['learners', 'Learners'], ['report', 'Where they struggle'], ['classes', 'Classes']]
              .map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}</div>
            {tab === 'learners' && <OrgLearners key={sel} orgId={sel} orgName={org.name} />}
            {tab === 'report' && <OrgInsights key={sel} orgId={sel} />}
            {tab === 'classes' && <OrgClasses key={sel} orgId={sel} canEdit={org.role === 'org_admin'} />}
            <p className="adm-note">You can see game names and results only. No real names, phone numbers or photos are collected. Use your own student reference (“Set ref”) to know who is who.</p>
          </>
        )}
      </main>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      <footer className="adm-foot">a product of ASARTUN STORE LIMITED</footer>
    </div>
  )
}

export default function OrgApp() {
  return (
    <AdminAuthProvider>
      <Routes><Route path="login" element={<OrgLogin />} /><Route path="*" element={<OrgHome />} /></Routes>
    </AdminAuthProvider>
  )
}
