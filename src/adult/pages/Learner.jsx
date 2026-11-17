import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import Assessment, { AssessmentResult } from './Assessment.jsx'
import { LangSwitch } from './Public.jsx'
import { useLiteracy } from './Lessons.jsx'
import { LESSONS } from '../curriculum.js'
import { summarize } from '../progress.js'

// Signed-in shell: content + 4 large tabs (Home, Lessons, Write, Help).
export function Shell() {
  const { t, status } = useAdult()
  if (status === 'loading') return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (status === 'signedOut') return <Navigate to="/adult/login" replace />
  if (status === 'error') return <div className="ad-page ad-center"><p className="ad-error">{t('errNetwork')}</p><button className="ad-btn primary" onClick={() => window.location.reload()}>{t('tryAgain')}</button></div>
  if (status === 'noAccount') return <div className="ad-page ad-center"><p className="ad-big">{t('noAdultAccount')}</p><Link className="ad-btn" to="/adult">{t('back')}</Link></div>
  return (
    <div className="ad-shell">
      <div className="ad-content"><Outlet /></div>
      <nav className="ad-tabs" aria-label="Main">
        {[['home', 'tabHome'], ['courses', 'tabCourses'], ['write', 'tabWrite'], ['help', 'tabHelp']].map(([to, k]) =>
          <NavLink key={to} to={'/adult/' + to} className={({ isActive }) => (isActive ? 'on' : '')}>{t(k)}</NavLink>)}
      </nav>
    </div>
  )
}

function useLearnerData() {
  const [d, setD] = useState({ loading: true, error: false, courses: [], enrolled: [], assessment: null })
  const load = useCallback(async () => {
    const [c, e, a] = await Promise.all([learnerApi.courses(), learnerApi.enrollments(), learnerApi.latestAssessment()])
    setD({ loading: false, error: Boolean(c.error || e.error || a.error), courses: c.data || [], enrolled: (e.data || []).map((x) => x.course_id), assessment: (a.data || [])[0] || null })
  }, [])
  useEffect(() => { load() }, [load])
  return { ...d, reload: load }
}

export function Home() {
  const { t, profile } = useAdult()
  const nav = useNavigate()
  const d = useLearnerData()
  const first = (profile?.display_name || profile?.full_name || '').split(' ')[0]
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  return (
    <main className="ad-page">
      <h1>{t('hello', { name: first })}</h1>
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      {!d.assessment
        ? <div className="ad-card"><p className="ad-big">{t('homeNoAssessment')}</p><button className="ad-btn primary" onClick={() => nav('/adult/assessment')}>{t('asStart')}</button></div>
        : <div className="ad-card"><h2>{t('yourStart')}</h2><AssessmentResult recommended={d.assessment.recommended} scores={d.assessment.scores} needsConfirmation={d.assessment.needs_confirmation} />
            <Link className="ad-btn primary" to="/adult/courses">{t('goLessons')}</Link></div>}
      <LiteracyCard />
      <p className="ad-note">{t('lessonsSoon')}</p>
    </main>
  )
}

function LiteracyCard() {
  const { t } = useAdult()
  const d = useLiteracy()
  if (d.loading || !d.enrolled) return null
  const sum = summarize(d.rows, LESSONS.map((l) => l.key))
  return (
    <div className="ad-card">
      <h2>{t('lessonsTitle')}</h2>
      <p className="ad-big">{t('progressLine', { done: sum.completed, total: sum.total })}</p>
      <div className="ad-progress" aria-hidden="true"><i style={{ width: (sum.completed / sum.total) * 100 + '%' }} /></div>
      <Link className="ad-btn primary" to="/adult/learn">{sum.completed === 0 ? t('startHere') : t('continueLesson')}</Link>
    </div>
  )
}

export function AssessmentPage() {
  const nav = useNavigate()
  const { t } = useAdult()
  const [done, setDone] = useState(false)
  return (<>
    <Assessment mode="self" onDone={() => setDone(true)} />
    {done && <div className="ad-page"><button className="ad-btn primary" onClick={() => nav('/adult/courses')}>{t('goLessons')}</button></div>}
  </>)
}

export function Courses() {
  const { t, lang } = useAdult()
  const d = useLearnerData()
  const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  const enroll = async (id) => {
    setErr(''); setBusy(id)
    const { error } = await learnerApi.enroll(id)
    setBusy('')
    if (error) setErr(t(error === 'network' ? 'errNetwork' : 'errGeneric')); else d.reload()
  }
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  return (
    <main className="ad-page">
      <h1>{t('tabCourses')}</h1>
      {err && <p className="ad-error" role="alert">{err}</p>}
      {d.courses.map((c) => {
        const enrolled = d.enrolled.includes(c.id)
        return (
          <section className="ad-card" key={c.id}>
            <h2>{c.title[lang] || c.title.en}</h2>
            <p>{c.description[lang] || c.description.en}</p>
            {c.status === 'coming_soon' && <p className="ad-note">{t('comingSoon')}</p>}
            {c.status === 'published' && !enrolled && <button className="ad-btn primary" disabled={busy === c.id} onClick={() => enroll(c.id)}>{c.is_free ? t('joinFree') : t('join')}</button>}
            {c.status === 'published' && enrolled && <><p className="ad-ok">{t('joined')}</p>{c.kind === 'literacy' ? <Link className="ad-btn primary" to="/adult/learn">{t('openLessons')}</Link> : <p className="ad-note">{t('lessonsNotYet')}</p>}</>}
          </section>
        )
      })}
    </main>
  )
}

export function Practice() {
  const { t } = useAdult()
  return (
    <main className="ad-page">
      <h1>{t('tabWrite')}</h1>
      <p className="ad-note">{t('practiceNote')}</p>
      <HandwritingCanvas height={320} labels={{ pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') }} />
    </main>
  )
}

export function Help() {
  const { t, profile, reload } = useAdult()
  const nav = useNavigate()
  const [msg, setMsg] = useState(''); const [confirm, setConfirm] = useState(false)
  const toggle = async (field) => { const { error } = await learnerApi.updateSettings(profile.id, { [field]: !profile[field] }); setMsg(error ? t('errNetwork') : ''); reload() }
  const out = async () => { await learnerApi.signOut(); nav('/adult') }
  const del = async () => { const { error } = await learnerApi.deleteAccount(); if (error) { setMsg(t('errNetwork')); return }; await learnerApi.signOut(); nav('/adult') }
  return (
    <main className="ad-page">
      <h1>{t('tabHelp')}</h1>
      <div className="ad-card"><p className="ad-big">{t('helpText')}</p></div>
      <LangSwitch />
      <label className="ad-check"><input type="checkbox" checked={profile.audio_on} onChange={() => toggle('audio_on')} /> <span>{t('setAudio')}</span></label>
      <label className="ad-check"><input type="checkbox" checked={profile.low_data} onChange={() => toggle('low_data')} /> <span>{t('setLowData')}</span></label>
      {msg && <p className="ad-error">{msg}</p>}
      <button className="ad-btn" onClick={out}>{t('signOut')}</button>
      {!confirm
        ? <button className="ad-link" onClick={() => setConfirm(true)}>{t('deleteMine')}</button>
        : <div className="ad-card"><p className="ad-error">{t('deleteSure')}</p><button className="ad-btn" onClick={del}>{t('deleteYes')}</button><button className="ad-link" onClick={() => setConfirm(false)}>{t('cancel')}</button></div>}
    </main>
  )
}
