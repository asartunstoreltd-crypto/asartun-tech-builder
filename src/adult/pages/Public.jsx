import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import { normalizePhone, pinProblem } from '../phone.js'

export function LangSwitch() {
  const { lang, setLang } = useAdult()
  return (
    <div className="ad-lang" role="group">
      <button type="button" className={lang === 'ha' ? 'on' : ''} onClick={() => setLang('ha')}>Hausa</button>
      <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
    </div>
  )
}

export function Landing() {
  const { t, status } = useAdult()
  if (status === 'ready') return <Navigate to="/adult/home" replace />
  return (
    <main className="ad-page ad-center">
      <LangSwitch />
      <h1 className="ad-brand">{t('brand')}</h1>
      <p className="ad-slogan">{t('slogan')}</p>
      <div className="ad-stack">
        <Link className="ad-btn primary" to="/adult/login">{t('signIn')}</Link>
        <Link className="ad-btn" to="/adult/register">{t('register')}</Link>
      </div>
      <p className="ad-note">{t('landingHelp')}</p>
      <Link className="ad-link" to="/adult/teach">{t('forFacilitators')}</Link>
    </main>
  )
}

const errText = (t, code) => t({ network: 'errNetwork', WRONG_LOGIN: 'errLogin', PHONE: 'errPhone', NAME: 'errName', PIN: 'errPin', ALREADY: 'errAlready', BUSY: 'errBusy', config: 'errConfig' }[code] || 'errGeneric')

export function Login() {
  const { t, status } = useAdult()
  const nav = useNavigate()
  const [phone, setPhone] = useState(''); const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  if (status === 'ready') return <Navigate to="/adult/home" replace />
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await learnerApi.signIn(phone, pin)
    setBusy(false)
    if (error) setErr(errText(t, error)); else nav('/adult/home')
  }
  return (
    <main className="ad-page">
      <LangSwitch />
      <h1>{t('signIn')}</h1>
      <form onSubmit={submit} className="ad-form">
        <label>{t('phone')}<input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" /></label>
        <label>{t('pin')}<input inputMode="numeric" type="password" maxLength={6} autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>
        {err && <p className="ad-error" role="alert">{err}</p>}
        <button className="ad-btn primary" disabled={busy || !phone || pin.length !== 6}>{busy ? t('wait') : t('signIn')}</button>
      </form>
      <p className="ad-note">{t('forgotPin')}</p>
      <Link className="ad-link" to="/adult">{t('back')}</Link>
    </main>
  )
}

export function Register() {
  const { t } = useAdult()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', phone: '', pin: '', pin2: '', consent: false })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: k === 'consent' ? e.target.checked : k.startsWith('pin') ? e.target.value.replace(/\D/g, '') : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.name.trim()) return setErr(t('errName'))
    if (!normalizePhone(f.phone)) return setErr(t('errPhone'))
    const p = pinProblem(f.pin); if (p) return setErr(t(p))
    if (f.pin !== f.pin2) return setErr(t('pinMismatch'))
    if (!f.consent) return setErr(t('errConsent'))
    setBusy(true)
    const { error } = await learnerApi.register(f.name.trim(), f.phone, f.pin)
    setBusy(false)
    if (error) setErr(errText(t, error)); else setDone(true)
  }
  if (done) return (
    <main className="ad-page ad-center">
      <h1>{t('regDone')}</h1>
      <p className="ad-note">{t('regDoneNote')}</p>
      <button className="ad-btn primary" onClick={() => nav('/adult/login')}>{t('signIn')}</button>
    </main>
  )
  return (
    <main className="ad-page">
      <LangSwitch />
      <h1>{t('register')}</h1>
      <p className="ad-note">{t('regHelp')}</p>
      <form onSubmit={submit} className="ad-form">
        <label>{t('fullName')}<input autoComplete="name" maxLength={80} value={f.name} onChange={set('name')} /></label>
        <label>{t('phone')}<input inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="080…" /></label>
        <label>{t('chooseAPin')}<input inputMode="numeric" type="password" maxLength={6} value={f.pin} onChange={set('pin')} /></label>
        <label>{t('pinAgain')}<input inputMode="numeric" type="password" maxLength={6} value={f.pin2} onChange={set('pin2')} /></label>
        <label className="ad-check"><input type="checkbox" checked={f.consent} onChange={set('consent')} /> <span>{t('consent')}</span></label>
        {err && <p className="ad-error" role="alert">{err}</p>}
        <button className="ad-btn primary" disabled={busy}>{busy ? t('wait') : t('register')}</button>
      </form>
      <Link className="ad-link" to="/adult">{t('back')}</Link>
    </main>
  )
}
