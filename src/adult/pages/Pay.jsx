import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'

// Paying for a premium course (Phase 8B). Money moves OUTSIDE the app (transfer, cash, agent). Here a learner can
//  - read how to pay (written by the adult admin),
//  - tap "I have paid" with a reference (the adult admin checks the money really arrived, then accepts), or
//  - type a one-time activation code.
// Access begins only when the DATABASE grants it. This screen never grants anything and never asks for a PIN or card number.
const ERR = { network: 'errNetwork', denied: 'errDenied', BADREF: 'errBadRef', WAITING: 'errWaiting', TOOMANYWAIT: 'errTooManyWaiting', HASACCESS: 'errHasAccess', BADCODE: 'errBadCode', CODETRIES: 'errCodeTries', NOCOURSE: 'errNoCourse' }
const STATUS = { pending: 'payStatus_pending', verified: 'payStatus_verified', rejected: 'payStatus_rejected', cancelled: 'payStatus_cancelled' }
const METHOD = { manual: 'payMethod_manual', code: 'payMethod_code', online: 'payMethod_online' }
const err = (t, code) => t(ERR[code] || 'errGeneric')
const fmt = (v) => (v ? new Date(v).toLocaleDateString() : '')

export default function PayPanel({ course, expired, endsAt, onDone }) {
  const { t, lang } = useAdult()
  const [info, setInfo] = useState(null); const [pays, setPays] = useState([])
  const [ref, setRef] = useState(''); const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false); const [e, setE] = useState(''); const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [i, p] = await Promise.all([learnerApi.paymentInfo(), learnerApi.myPayments()])
    setInfo(i.data || null); setPays((p.data || []).filter((x) => x.course_id === course.id))
  }, [course.id])
  useEffect(() => { load() }, [load])
  const pending = pays.find((x) => x.status === 'pending')
  const last = pays[0]
  // while a request waits, look again now and then; once the admin accepts, open the course
  useEffect(() => {
    if (!pending) return undefined
    const id = setInterval(async () => { await load(); onDone() }, 30000)
    return () => clearInterval(id)
  }, [pending, load, onDone])
  const run = async (fn, ok) => { setBusy(true); setE(''); setMsg(''); const { error } = await fn(); setBusy(false); if (error) return setE(err(t, error)); if (ok) setMsg(t(ok)); await load(); onDone() }
  if (course.status !== 'published') return <p className="ad-note">{t('payNotPublished')}</p>
  const text = info && info.instructions ? (info.instructions[lang] || info.instructions.en || '') : ''
  return (
    <section className="ad-stack">
      <div className="ad-card">
        <h2>{t('payTitle')}</h2>
        <p className="ad-pay-price">{t('payPrice', { price: Number(course.price_ngn).toLocaleString() })}</p>
        <p>{course.access_days ? t('payDays', { days: course.access_days }) : t('payNoEnd')}</p>
        {expired && <p className="ad-error">{t('payExpired', { date: fmt(endsAt) })}</p>}
      </div>
      <div className="ad-card">
        <h2>{t('payHow')}</h2>
        {text ? <p className="ad-big" style={{ whiteSpace: 'pre-wrap' }}>{text}</p> : <p className="ad-note">{t('payNoInfo')}</p>}
        {info && info.account_details && <><h3>{t('payAccount')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{info.account_details}</p></>}
        {info && info.whatsapp && <p>{t('payWhatsapp', { n: info.whatsapp })}</p>}
        <p className="ad-note">{t('payNever')}</p>
      </div>
      {pending ? (
        <div className="ad-card">
          <p className="ad-big" role="status">{t('payWait')}</p><p className="ad-note">{pending.reference}</p>
          <button className="ad-btn" disabled={busy} onClick={() => { load(); onDone() }}>{t('payCheck')}</button>
          <button className="ad-link" disabled={busy} onClick={() => run(() => learnerApi.cancelPayment(pending.id))}>{t('payCancel')}</button>
        </div>
      ) : (
        <form className="ad-card ad-form" onSubmit={(ev) => { ev.preventDefault(); run(() => learnerApi.requestPayment(course.id, ref), 'payWait').then(() => setRef('')) }}>
          <h2>{t('payPaidTitle')}</h2>
          {last && last.status === 'rejected' && <p className="ad-error">{last.reject_reason ? t('payRejected', { reason: last.reject_reason }) : t('payRejectedNoReason')}</p>}
          <label>{t('payRef')}<input value={ref} maxLength={60} autoComplete="off" onChange={(ev) => setRef(ev.target.value)} /></label>
          <button className="ad-btn primary" disabled={busy || ref.trim().length < 3}>{t('paySend')}</button>
        </form>)}
      <form className="ad-card ad-form" onSubmit={(ev) => { ev.preventDefault(); run(() => learnerApi.redeemCode(code), 'payVerified').then(() => setCode('')) }}>
        <h2>{t('payCodeTitle')}</h2>
        <label>{t('payCodeLabel')}<input value={code} maxLength={20} autoCapitalize="characters" autoComplete="off" placeholder="XXXX-XXXX-XXXX" onChange={(ev) => setCode(ev.target.value)} /></label>
        <button className="ad-btn" disabled={busy || code.replace(/[^0-9A-Za-z]/g, '').length !== 12}>{t('payCodeGo')}</button>
      </form>
      {e && <p className="ad-error" role="alert">{e}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <Link className="ad-link" to="/adult/payments">{t('payHistory')}</Link>
    </section>
  )
}

// All the learner's own payment requests, newest first.
export function PaymentHistory() {
  const { t } = useAdult()
  const [rows, setRows] = useState(null)
  useEffect(() => { learnerApi.myPayments().then(({ data }) => setRows(data || [])) }, [])
  if (!rows) return <main className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></main>
  return (
    <main className="ad-page">
      <h1>{t('payHistory')}</h1>
      {rows.length === 0 ? <p className="ad-note">{t('payNone')}</p> : rows.map((p) => (
        <div className="ad-card" key={p.id}>
          <p><strong>{t(STATUS[p.status])}</strong> · {t(METHOD[p.method])}</p>
          <p>₦{Number(p.amount_ngn).toLocaleString()} · {fmt(p.created_at)}</p>
          {p.reference && <p className="ad-note">{p.reference}</p>}
          {p.status === 'rejected' && p.reject_reason && <p className="ad-error">{t('payRejected', { reason: p.reject_reason })}</p>}
        </div>))}
      <Link className="ad-link" to="/adult/courses">{t('back')}</Link>
    </main>
  )
}
