import { useCallback, useEffect, useState } from 'react'
import { staffApi } from '../adultApi.js'
import { useAdult } from '../AdultAuth.jsx'
import { CertificateCard } from './Certificate.jsx'

// Adult-admin screens (Phase 8): which courses are free or premium, payments, activation codes, certificates.
// The screen only arranges things; every rule (who may do it, price limits, one-time codes, access dates) is checked by the database.
const ERR = { network: 'errNetwork', denied: 'errDenied', BADPRICE: 'errBadPrice', BADCOURSE: 'errBadCourse', BADINFO: 'errBadInfo', BADCODES: 'errBadCodes', DECIDED: 'errDecided', NOCOURSE: 'errNoCourse' }
const e2 = (t, code) => t(ERR[code] || 'errGeneric')
const STATUS = { draft: 'stDraft', published: 'stPublished', coming_soon: 'stSoon', archived: 'stArchived' }
const PSTATUS = { pending: 'payStatus_pending', verified: 'payStatus_verified', rejected: 'payStatus_rejected', cancelled: 'payStatus_cancelled' }
const CODE_STATE = { unused: 'apCodeState_unused', used: 'apCodeState_used', expired: 'apCodeState_expired' }
const fmt = (v) => (v ? new Date(v).toLocaleDateString() : '')
const title = (c, lang) => (c.title ? c.title[lang] || c.title.en : '')

// ---------------------------------------------------------------- courses: free or premium
export function CoursesTab() {
  const { t, lang } = useAdult()
  const [list, setList] = useState(null)
  const load = useCallback(() => staffApi.courses().then(({ data }) => setList(data || [])), [])
  useEffect(() => { load() }, [load])
  if (!list) return <p className="ad-note">{t('wait')}</p>
  return (
    <section className="ad-stack">
      <h2>{t('acTitle')}</h2><p className="ad-note">{t('acNoteGrand')}</p>
      {list.map((c) => <CourseForm key={c.id + c.status + c.price_ngn + c.is_free} c={c} lang={lang} onSaved={load} />)}
    </section>
  )
}
function CourseForm({ c, lang, onSaved }) {
  const { t } = useAdult()
  const [f, setF] = useState({ status: c.status, free: c.is_free, price: c.is_free ? '' : String(c.price_ngn), days: c.access_days ? String(c.access_days) : '' })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const save = async (ev) => {
    ev.preventDefault(); setMsg(''); setErr('')
    const price = Math.round(Number(f.price)); const days = f.days === '' ? null : Math.round(Number(f.days))
    if (!f.free && (!Number.isFinite(price) || price < 1)) return setErr(t('acNeedPrice'))
    setBusy(true)
    const { error } = await staffApi.setCourse({ course: c.id, status: f.status, free: f.free, price, days })
    setBusy(false); if (error) return setErr(e2(t, error)); setMsg(t('acSaved')); onSaved()
  }
  return (
    <form className="ad-card ad-form" onSubmit={save}>
      <h3>{title(c, lang)}</h3>
      <label>{t('acStatus')}<select value={f.status} onChange={(ev) => setF({ ...f, status: ev.target.value })}>{Object.keys(STATUS).map((s) => <option key={s} value={s}>{t(STATUS[s])}</option>)}</select></label>
      <div className="ad-seg" role="group" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <button type="button" aria-pressed={f.free} className={f.free ? 'on present' : ''} onClick={() => setF({ ...f, free: true })}>{t('acFree')}</button>
        <button type="button" aria-pressed={!f.free} className={!f.free ? 'on present' : ''} onClick={() => setF({ ...f, free: false })}>{t('acPremium')}</button>
      </div>
      {!f.free && <><label>{t('acPrice')}<input inputMode="numeric" value={f.price} onChange={(ev) => setF({ ...f, price: ev.target.value.replace(/\D/g, '') })} /></label>
        <label>{t('acDays')}<input inputMode="numeric" value={f.days} onChange={(ev) => setF({ ...f, days: ev.target.value.replace(/\D/g, '') })} /></label></>}
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <button className="ad-btn primary" disabled={busy}>{t('acSave')}</button>
    </form>
  )
}

// ---------------------------------------------------------------- payments, payment info, activation codes
export function PaymentsTab() {
  const { t } = useAdult()
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [notice, setNotice] = useState('')
  const load = useCallback(async () => { const { data, error } = await staffApi.adminPayments(null); if (error) setErr(e2(t, error)); else setRows(data || []) }, [t])
  useEffect(() => { load() }, [load])
  if (!rows) return err ? <p className="ad-error" role="alert">{err}</p> : <p className="ad-note">{t('wait')}</p>
  const pending = rows.filter((x) => x.status === 'pending'); const history = rows.filter((x) => x.status !== 'pending')
  return (
    <section className="ad-stack">
      <h2>{t('apPending')}</h2><p className="ad-note">{t('apCheckMoney')}</p>
      {notice && <p className="ad-ok" role="status">{notice}</p>}
      {pending.length === 0 ? <p className="ad-note">{t('apNone')}</p> : pending.map((p) => <PendingRow key={p.id} p={p} onDone={(accepted) => { setNotice(accepted ? t('apAccepted') : ''); load() }} />)}
      <PaymentInfoForm />
      <CodesPanel />
      <h2>{t('apHistory')}</h2>
      {history.length === 0 ? <p className="ad-note">{t('apNone')}</p> : <ul className="ad-list">{history.map((p) => <li key={p.id}><div className="ad-row"><strong>{p.learner_name}</strong><span>{t(PSTATUS[p.status])}</span></div><span className="ad-note">{p.course_title.en} · ₦{Number(p.amount_ngn).toLocaleString()} · {p.reference || ''} · {fmt(p.created_at)}</span></li>)}</ul>}
    </section>
  )
}
function PendingRow({ p, onDone }) {
  const { t, lang } = useAdult()
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const act = async (fn, accepted) => { setBusy(true); setErr(''); const { error } = await fn(); setBusy(false); if (error) setErr(e2(t, error)); else onDone(Boolean(accepted)) }
  return (
    <div className="ad-card">
      <p><strong>{t('apLine', { name: p.learner_name, phone: p.learner_phone })}</strong></p>
      <p>{title(p, lang) || (p.course_title[lang] || p.course_title.en)} · ₦{Number(p.amount_ngn).toLocaleString()} · {p.access_days ? p.access_days + ' d' : '∞'}</p>
      <p className="ad-note">{p.reference} · {fmt(p.created_at)}</p>
      <label>{t('apReason')}<input maxLength={200} value={reason} onChange={(ev) => setReason(ev.target.value)} /></label>
      {err && <p className="ad-error" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy} onClick={() => act(() => staffApi.verifyPayment(p.id), true)}>{t('apApprove')}</button>
      <button className="ad-btn" disabled={busy} onClick={() => act(() => staffApi.rejectPayment(p.id, reason))}>{t('apReject')}</button>
    </div>
  )
}
function PaymentInfoForm() {
  const { t } = useAdult()
  const [f, setF] = useState(null); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  useEffect(() => { staffApi.paymentInfo().then(({ data }) => setF({ ha: data?.instructions?.ha || '', en: data?.instructions?.en || '', account: data?.account_details || '', whatsapp: data?.whatsapp || '' })) }, [])
  if (!f) return null
  const save = async (ev) => { ev.preventDefault(); setMsg(''); setErr(''); const { error } = await staffApi.setPaymentInfo({ instructions: { ha: f.ha, en: f.en }, account: f.account, whatsapp: f.whatsapp }); if (error) setErr(e2(t, error)); else setMsg(t('acSaved')) }
  return (
    <form className="ad-card ad-form" onSubmit={save}>
      <h3>{t('apInfoTitle')}</h3>
      <label>{t('apInstrHa')}<textarea rows={4} maxLength={1000} value={f.ha} onChange={(ev) => setF({ ...f, ha: ev.target.value })} /></label>
      <label>{t('apInstrEn')}<textarea rows={4} maxLength={1000} value={f.en} onChange={(ev) => setF({ ...f, en: ev.target.value })} /></label>
      <label>{t('apAccount')}<textarea rows={3} maxLength={600} value={f.account} onChange={(ev) => setF({ ...f, account: ev.target.value })} /></label>
      <label>{t('apWhats')}<input inputMode="tel" maxLength={16} value={f.whatsapp} onChange={(ev) => setF({ ...f, whatsapp: ev.target.value })} /></label>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <button className="ad-btn primary">{t('acSave')}</button>
    </form>
  )
}
function CodesPanel() {
  const { t, lang } = useAdult()
  const [courses, setCourses] = useState([]); const [codes, setCodes] = useState([]); const [made, setMade] = useState([])
  const [f, setF] = useState({ course: '', count: '1', note: '', days: '90' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { const [c, k] = await Promise.all([staffApi.courses(), staffApi.codes()]); const paid = (c.data || []).filter((x) => !x.is_free); setCourses(paid); setCodes(k.data || []); setF((x) => ({ ...x, course: x.course || paid[0]?.id || '' })) }, [])
  useEffect(() => { load() }, [load])
  const make = async (ev) => {
    ev.preventDefault(); setErr(''); setBusy(true)
    const { data, error } = await staffApi.createCodes({ course: f.course, count: Number(f.count), note: f.note, days: Number(f.days) })
    setBusy(false); if (error) return setErr(e2(t, error)); setMade(data || []); load()
  }
  if (courses.length === 0) return <p className="ad-note">{t('apNoPaid')}</p>
  return (
    <div className="ad-card">
      <h3>{t('apCodes')}</h3>
      <form className="ad-form" onSubmit={make}>
        <label>{t('apCodeCourse')}<select value={f.course} onChange={(ev) => setF({ ...f, course: ev.target.value })}>{courses.map((c) => <option key={c.id} value={c.id}>{title(c, lang)}</option>)}</select></label>
        <label>{t('apCodeCount')}<input inputMode="numeric" value={f.count} onChange={(ev) => setF({ ...f, count: ev.target.value.replace(/\D/g, '') })} /></label>
        <label>{t('apCodeNote')}<input maxLength={80} value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} /></label>
        <label>{t('apCodeDays')}<input inputMode="numeric" value={f.days} onChange={(ev) => setF({ ...f, days: ev.target.value.replace(/\D/g, '') })} /></label>
        {err && <p className="ad-error" role="alert">{err}</p>}
        <button className="ad-btn primary" disabled={busy || !f.course}>{t('apCodeMake')}</button>
      </form>
      {made.length > 0 && <div className="ad-card"><p className="ad-error"><strong>{t('apCodesOnce')}</strong></p><pre className="ad-big" style={{ whiteSpace: 'pre-wrap' }}>{made.join('\n')}</pre></div>}
      <ul className="ad-list">{codes.map((k) => <li key={k.id}><div className="ad-row"><strong>…{k.hint}</strong><span>{t(CODE_STATE[k.state])}</span></div><span className="ad-note">{k.course_title.en}{k.note ? ' · ' + k.note : ''} · {fmt(k.created_at)}{k.redeemed_by_name ? ' · ' + k.redeemed_by_name : ''}</span></li>)}</ul>
    </div>
  )
}

// ---------------------------------------------------------------- certificates (staff read; only the adult admin withdraws)
export function CertificatesTab({ role }) {
  const { t } = useAdult()
  const [rows, setRows] = useState(null); const [open, setOpen] = useState(null); const [reason, setReason] = useState(''); const [err, setErr] = useState('')
  const load = useCallback(() => staffApi.certificates().then(({ data }) => setRows(data || [])), [])
  useEffect(() => { load() }, [load])
  if (!rows) return <p className="ad-note">{t('wait')}</p>
  const revoke = async (id) => { setErr(''); const { error } = await staffApi.revokeCertificate(id, reason); if (error) setErr(e2(t, error)); else { setReason(''); setOpen(null); load() } }
  const sel = rows.find((x) => x.id === open)
  return (
    <section className="ad-stack">
      {rows.length === 0 ? <p className="ad-note">{t('certNone')}</p> : <ul className="ad-list">{rows.map((c) => <li key={c.id}><button onClick={() => setOpen(c.id)}><strong>{c.learner_name}</strong><span>{c.number} · {c.status === 'valid' ? t('certValid') : t('certRevoked')}</span></button></li>)}</ul>}
      {sel && (
        <div className="ad-stack">
          <CertificateCard cert={sel} />
          <button className="ad-btn ad-noprint" onClick={() => window.print()}>{t('certPrint')}</button>
          {role === 'adult_admin' && sel.status === 'valid' && <div className="ad-card ad-noprint"><label>{t('certWithdrawReason')}<input maxLength={200} value={reason} onChange={(ev) => setReason(ev.target.value)} /></label>{err && <p className="ad-error" role="alert">{err}</p>}<button className="ad-btn" onClick={() => revoke(sel.id)}>{t('certWithdraw')}</button></div>}
        </div>)}
    </section>
  )
}
