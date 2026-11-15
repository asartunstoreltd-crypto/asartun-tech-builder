import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { getPaymentInfo, getPlans, myPayments, myPremium, redeemCode, submitPayment } from '../lib/learnerSync.js'

// Shown when a premium lesson is locked. Payment itself happens OUTSIDE the app (bank / cash / mobile money).
export default function Unlock({ onBack, onUnlocked }) {
  const { t, L } = useLang()
  const [plans, setPlans] = useState(null)
  const [info, setInfo] = useState(null)
  const [reqs, setReqs] = useState([])
  const [prem, setPrem] = useState(null)
  const [plan, setPlan] = useState('')
  const [ref, setRef] = useState('')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [p, i, r, m] = await Promise.all([getPlans(), getPaymentInfo(), myPayments(), myPremium()])
      setPlans(p); setInfo(i); setReqs(r || []); setPrem(m)
      if (m && m.active) onUnlocked()            // payment approved (or code used): open the lessons
    } catch { setPlans((x) => x || []) }
  }
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true); setMsg(null)
    try { await submitPayment(plan, ref, contact); setMsg({ ok: t('sentOk') }); setRef(''); setContact(''); await load() } catch { setMsg({ err: t('sendBad') }) }
    setBusy(false)
  }
  const redeem = async () => {
    setBusy(true); setMsg(null)
    try { await redeemCode(code); setMsg({ ok: t('codeOk') }); await load(); onUnlocked() } catch { setMsg({ err: t('codeBad') }) }
    setBusy(false)
  }
  const wa = info && info.whatsapp ? 'https://wa.me/' + info.whatsapp.replace(/\D/g, '') : null
  return (
    <div className="page">
      <button className="btn ghost" onClick={onBack}>{t('back')}</button>
      <h2>{t('unlockTitle')}</h2>
      <p>{t('unlockIntro')}</p>
      {prem && prem.active && <p className="good">{prem.until ? t('activeUntil', { date: new Date(prem.until).toLocaleDateString() }) : t('activeNoEnd')}</p>}

      <div className="card">
        <h3>{t('choosePlan')}</h3>
        {plans && plans.length === 0 && <p className="small">{t('noPlans')}</p>}
        {plans && plans.map((p) => (
          <label key={p.id} className={'opt' + (plan === p.id ? ' right' : '')}>
            <input type="radio" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} /> <b>{L(p.name)}</b> · {t('planDays', { n: p.days })} · ₦{Number(p.price_ngn).toLocaleString()}
          </label>
        ))}
        {info && (
          <>
            <h3>{t('payHow')}</h3>
            <p>{L(info.instructions)}</p>
            {info.account_details && <p className="payacc">{info.account_details}</p>}
            {wa && <a className="btn alt" href={wa} target="_blank" rel="noreferrer">{t('whatsappBtn')}</a>}
          </>
        )}
        <p className="warn">{t('neverCard')}</p>
      </div>

      {plans && plans.length > 0 && (
        <div className="card">
          <h3>{t('iPaid')}</h3>
          <input className="input" maxLength={120} placeholder={t('refLabel')} value={ref} onChange={(e) => setRef(e.target.value)} />
          <input className="input" maxLength={60} placeholder={t('contactLabel')} value={contact} onChange={(e) => setContact(e.target.value)} />
          <button className="btn" disabled={busy || !plan || ref.trim().length < 3} onClick={send}>{t('sendPaid')}</button>
        </div>
      )}

      <div className="card">
        <h3>{t('haveCode')}</h3>
        <input className="input" maxLength={14} placeholder={t('codeLabel')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={busy || code.replace(/[^A-Z0-9]/gi, '').length < 6} onClick={redeem}>{t('redeemBtn')}</button>
      </div>
      {msg && <p className={msg.err ? 'bad' : 'good'}>{msg.err || msg.ok}</p>}

      {reqs.length > 0 && (
        <div className="card"><h3>{t('yourRequests')}</h3>
          {reqs.map((r) => (
            <p key={r.id}><b>{L(r.plan_name)}</b> · ₦{Number(r.amount_ngn).toLocaleString()} · {t('st_' + r.status)}{r.admin_note ? ' · ' + r.admin_note : ''}<br /><span className="small">{new Date(r.created_at).toLocaleString()}</span></p>
          ))}
        </div>
      )}
    </div>
  )
}
