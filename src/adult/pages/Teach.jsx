import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../adultSupabase.js'
import { staffApi } from '../adultApi.js'
import { useAdult } from '../AdultAuth.jsx'
import { normalizePhone } from '../phone.js'
import Assessment, { AssessmentResult } from './Assessment.jsx'
import { LangSwitch } from './Public.jsx'

// Facilitator / adult-admin area. The screen only hides things for convenience;
// the database decides which learners and classes each person may see.
const E = (t, code) => t({ network: 'errNetwork', denied: 'errDenied', ALREADY: 'errAlready', PHONE: 'errPhone', NAME: 'errName', PIN: 'errPin', CLASS_REQUIRED: 'errClassRequired', config: 'errConfig' }[code] || 'errGeneric')

export default function Teach() {
  const { t } = useAdult()
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(null)             // null = checking, 'none' = signed in but not staff
  useEffect(() => {
    if (!supabaseStaff) { setSession(null); return }
    supabaseStaff.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabaseStaff.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) { setRole(null); return }
    staffApi.me(uid).then(({ data }) => setRole(data && data.active ? data.role : 'none'))
  }, [uid])

  if (session === undefined) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (!session) return <StaffLogin />
  if (role === null) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (role === 'none') return <div className="ad-page ad-center"><p className="ad-big">{t('noStaffAccess')}</p><button className="ad-btn" onClick={() => supabaseStaff.auth.signOut()}>{t('signOut')}</button></div>
  return <Dashboard role={role} />
}

function StaffLogin() {
  const { t } = useAdult()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = supabaseStaff ? await supabaseStaff.auth.signInWithPassword({ email: email.trim(), password: pw }) : { error: true }
    setBusy(false); if (error) setErr(t('errStaffLogin'))
  }
  return (
    <main className="ad-page">
      <LangSwitch />
      <h1>{t('forFacilitators')}</h1>
      <form className="ad-form" onSubmit={go}>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t('password')}<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {err && <p className="ad-error" role="alert">{err}</p>}
        <button className="ad-btn primary" disabled={busy || !email || !pw}>{t('signIn')}</button>
      </form>
      <Link className="ad-link" to="/adult">{t('back')}</Link>
    </main>
  )
}

function Dashboard({ role }) {
  const { t } = useAdult()
  const [tab, setTab] = useState('learners')
  const tabs = [['learners', 'tLearners'], ['classes', 'tClasses'], ...(role === 'adult_admin' ? [['staff', 'tStaff']] : [])]
  return (
    <div className="ad-page wide">
      <div className="ad-row"><h1>{t('forFacilitators')}</h1><button className="ad-link" onClick={() => supabaseStaff.auth.signOut()}>{t('signOut')}</button></div>
      <div className="ad-subtabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(l)}</button>)}</div>
      {tab === 'learners' && <Learners role={role} />}
      {tab === 'classes' && <Classes role={role} />}
      {tab === 'staff' && <StaffTab />}
    </div>
  )
}

function Secret({ label, value, onClose }) {
  const { t } = useAdult()
  return <div className="ad-card ad-secret" role="status"><p>{label}</p><p className="ad-huge">{value}</p><p className="ad-note">{t('shownOnce')}</p><button className="ad-btn" onClick={onClose}>{t('done')}</button></div>
}

function Learners({ role }) {
  const { t } = useAdult()
  const [q, setQ] = useState(''); const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null); const [adding, setAdding] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await staffApi.learners(q.trim())
    setLoading(false); setErr(error ? E(t, error) : ''); setRows(data || [])
  }, [q, t])
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h) }, [load])
  if (open) return <LearnerDetail id={open} onBack={() => { setOpen(null); load() }} />
  if (adding) return <NewLearner role={role} onBack={() => { setAdding(false); load() }} />
  return (
    <section>
      <div className="ad-row"><input className="ad-search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} /><button className="ad-btn primary" onClick={() => setAdding(true)}>{t('newLearner')}</button></div>
      {err && <p className="ad-error">{err}</p>}
      {loading ? <p className="ad-note">{t('wait')}</p> : rows.length === 0 ? <p className="ad-note">{t('noLearners')}</p> :
        <ul className="ad-list">{rows.map((r) => (
          <li key={r.id}><button onClick={() => setOpen(r.id)}>
            <strong>{r.full_name}</strong><span>{r.phone}</span>
            <span className="ad-note">{r.classes.length ? r.classes.join(', ') : t('noClass')}{r.phone_verified ? '' : ' · ' + t('phoneUnverified')}</span>
          </button></li>))}</ul>}
    </section>
  )
}

function NewLearner({ role, onBack }) {
  const { t } = useAdult()
  const [classes, setClasses] = useState([]); const [f, setF] = useState({ name: '', phone: '', cls: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [pin, setPin] = useState(null)
  useEffect(() => { staffApi.classes().then(({ data }) => setClasses((data || []).filter((c) => c.status === 'active'))) }, [])
  const go = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.name.trim()) return setErr(t('errName')); if (!normalizePhone(f.phone)) return setErr(t('errPhone'))
    if (role !== 'adult_admin' && !f.cls) return setErr(t('errClassRequired'))
    setBusy(true)
    const { data, error } = await staffApi.createLearner({ full_name: f.name.trim(), phone: f.phone, class_id: f.cls || undefined })
    setBusy(false); if (error) setErr(E(t, error)); else setPin(data.pin)
  }
  if (pin) return <><Secret label={t('learnerPinIs', { name: f.name })} value={pin} onClose={onBack} /></>
  return (
    <form className="ad-form" onSubmit={go}>
      <h2>{t('newLearner')}</h2>
      <p className="ad-note">{t('assistedNote')}</p>
      <label>{t('fullName')}<input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>{t('phone')}<input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="080…" /></label>
      <label>{t('class')}<select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}><option value="">{role === 'adult_admin' ? t('noClass') : '—'}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {err && <p className="ad-error" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy}>{t('create')}</button>
      <button type="button" className="ad-link" onClick={onBack}>{t('back')}</button>
    </form>
  )
}

function LearnerDetail({ id, onBack }) {
  const { t } = useAdult()
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [assess, setAssess] = useState(false); const [pin, setPin] = useState(null); const [sure, setSure] = useState(false)
  const load = useCallback(async () => { const { data, error } = await staffApi.detail(id); if (error) setErr(E(t, error)); else setD(data) }, [id, t])
  useEffect(() => { load() }, [load])
  const reset = async () => { setSure(false); const { data, error } = await staffApi.resetPin(id); if (error) setErr(E(t, error)); else setPin(data.pin) }
  if (err) return <><p className="ad-error">{err}</p><button className="ad-link" onClick={onBack}>{t('back')}</button></>
  if (!d) return <p className="ad-note">{t('wait')}</p>
  if (assess) return <><Assessment mode="assisted" learnerId={id} learnerName={d.profile.full_name} onDone={load} /><button className="ad-link" onClick={() => { setAssess(false); load() }}>{t('back')}</button></>
  const last = d.assessments[0]
  return (
    <section>
      <button className="ad-link" onClick={onBack}>{t('back')}</button>
      <h2>{d.profile.full_name}</h2>
      <p>{d.profile.phone} {d.profile.phone_verified ? '' : '· ' + t('phoneUnverified')}</p>
      <p className="ad-note">{d.classes.length ? d.classes.map((c) => c.name).join(', ') : t('noClass')}</p>
      {pin && <Secret label={t('learnerPinIs', { name: d.profile.full_name })} value={pin} onClose={() => setPin(null)} />}
      <div className="ad-row">
        <button className="ad-btn primary" onClick={() => setAssess(true)}>{t('runAssessment')}</button>
        {!sure ? <button className="ad-btn" onClick={() => setSure(true)}>{t('resetPin')}</button> : <button className="ad-btn" onClick={reset}>{t('resetSure')}</button>}
      </div>
      <h3>{t('lastAssessment')}</h3>
      {last ? <><p className="ad-note">{new Date(last.created_at).toLocaleDateString()} · {t(last.mode === 'assisted' ? 'modeAssisted' : 'modeSelf')}</p>
        <AssessmentResult recommended={last.recommended} scores={last.scores} needsConfirmation={last.needs_confirmation} /></> : <p className="ad-note">{t('noAssessmentYet')}</p>}
    </section>
  )
}

function Classes({ role }) {
  const { t, lang } = useAdult()
  const [rows, setRows] = useState([]); const [courses, setCourses] = useState([]); const [err, setErr] = useState(''); const [msg, setMsg] = useState('')
  const [f, setF] = useState({ name: '', course: '', mode: 'physical', location: '' }); const [phone, setPhone] = useState({}); const [email, setEmail] = useState({})
  const load = useCallback(async () => { const [c, k] = await Promise.all([staffApi.classes(), staffApi.courses()]); setRows(c.data || []); setCourses(k.data || []); setErr(c.error ? E(t, c.error) : '') }, [t])
  useEffect(() => { load() }, [load])
  const run = async (p, ok) => { setMsg(''); setErr(''); const { error } = await p; if (error) setErr(E(t, error)); else { setMsg(ok); load() } }
  return (
    <section>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      {role === 'adult_admin' && (
        <form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(staffApi.createClass(f.name, f.course, f.mode, f.location), t('saved')); setF({ ...f, name: '' }) }}>
          <h2>{t('newClass')}</h2>
          <label>{t('className')}<input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label>{t('course')}<select value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })}><option value="">—</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title[lang] || c.title.en}</option>)}</select></label>
          <label>{t('howMeet')}<select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="physical">{t('modePhysical')}</option><option value="online">{t('modeOnline')}</option><option value="both">{t('modeBoth')}</option></select></label>
          <label>{t('location')}<input maxLength={120} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
          <button className="ad-btn primary" disabled={!f.name.trim()}>{t('create')}</button>
        </form>)}
      {rows.length === 0 ? <p className="ad-note">{t('noClasses')}</p> : rows.map((c) => (
        <div className="ad-card" key={c.id}>
          <h3>{c.name}</h3><p className="ad-note">{t('mode' + c.mode[0].toUpperCase() + c.mode.slice(1))}{c.location ? ' · ' + c.location : ''}</p>
          <div className="ad-row"><input inputMode="tel" placeholder={t('phone')} value={phone[c.id] || ''} onChange={(e) => setPhone({ ...phone, [c.id]: e.target.value })} />
            <button className="ad-btn" disabled={!normalizePhone(phone[c.id] || '')} onClick={() => run(staffApi.addMember(c.id, normalizePhone(phone[c.id])), t('saved'))}>{t('addLearner')}</button></div>
          {role === 'adult_admin' && <div className="ad-row"><input type="email" placeholder={t('facilitatorEmail')} value={email[c.id] || ''} onChange={(e) => setEmail({ ...email, [c.id]: e.target.value })} />
            <button className="ad-btn" disabled={!email[c.id]} onClick={() => run(staffApi.assignFacilitator(c.id, email[c.id]), t('saved'))}>{t('assign')}</button></div>}
        </div>))}
    </section>
  )
}

function StaffTab() {
  const { t } = useAdult()
  const [f, setF] = useState({ email: '', role: 'facilitator' }); const [err, setErr] = useState(''); const [out, setOut] = useState(null); const [busy, setBusy] = useState(false)
  const go = async (e) => { e.preventDefault(); setErr(''); setBusy(true); const { data, error } = await staffApi.createStaff(f); setBusy(false); if (error) setErr(E(t, error)); else setOut(data) }
  if (out) return <Secret label={t('staffPwIs', { email: out.email })} value={out.password} onClose={() => { setOut(null); setF({ email: '', role: 'facilitator' }) }} />
  return (
    <form className="ad-form" onSubmit={go}>
      <h2>{t('newStaff')}</h2>
      <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>{t('role')}<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="facilitator">{t('roleFacilitator')}</option><option value="adult_admin">{t('roleAdmin')}</option></select></label>
      {err && <p className="ad-error" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy || !f.email}>{t('create')}</button>
    </form>
  )
}
