import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import Say from '../components/Say.jsx'
import Assessment, { AssessmentResult } from './Assessment.jsx'
import { LangSwitch } from './Public.jsx'
import { useCourse } from './Lessons.jsx'
import { COURSES } from '../courses.js'
import { summarize } from '../progress.js'

// Signed-in shell: content + 4 large tabs (Home, Lessons, Write, Help).
export function Shell() {
  const { t, status } = useAdult()
  const { pathname } = useLocation()
  if (status === 'loading') return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (status === 'signedOut') return <Navigate to="/adult/login" replace />
  if (status === 'error') return <div className="ad-page ad-center"><p className="ad-error">{t('errNetwork')}</p><button className="ad-btn primary" onClick={() => window.location.reload()}>{t('tryAgain')}</button></div>
  if (status === 'noAccount') return <div className="ad-page ad-center"><p className="ad-big">{t('noAdultAccount')}</p><Link className="ad-btn" to="/adult">{t('back')}</Link></div>
  return (
    <div className="ad-shell">
      <div className="ad-content"><Outlet /></div>
      <nav className="ad-tabs" aria-label="Main">
        {[['home', 'tabHome'], ['courses', 'tabCourses'], ['write', 'tabWrite'], ['help', 'tabHelp']].map(([to, k]) =>
          <NavLink key={to} to={'/adult/' + to} className={({ isActive }) => (isActive || (to === 'write' && /^\/adult\/(work|practice)/.test(pathname)) ? 'on' : '')}>{t(k)}</NavLink>)}
      </nav>
    </div>
  )
}

function useLearnerData() {
  const [d, setD] = useState({ loading: true, error: false, courses: [], enrolled: [], expired: [], ends: {}, assessment: null })
  const load = useCallback(async () => {
    const [c, e, a] = await Promise.all([learnerApi.courses(), learnerApi.enrollments(), learnerApi.latestAssessment()])
    setD({ loading: false, error: Boolean(c.error || e.error || a.error), courses: c.data || [], enrolled: (e.data || []).filter((x) => !x.ends_at || Date.parse(x.ends_at) > Date.now()).map((x) => x.course_id), expired: (e.data || []).filter((x) => x.ends_at && Date.parse(x.ends_at) <= Date.now()).map((x) => x.course_id), ends: Object.fromEntries((e.data || []).filter((x) => x.ends_at).map((x) => [x.course_id, x.ends_at])), assessment: (a.data || [])[0] || null })
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
      <h1>{t('hello', { name: first })}</h1><Say k="hello" vars={{ name: first }} />
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      {!d.assessment
        ? <div className="ad-card"><p className="ad-big">{t('homeNoAssessment')}</p><Say k="homeNoAssessment" /><button className="ad-btn primary" onClick={() => nav('/adult/assessment')}>{t('asStart')}</button></div>
        : <div className="ad-card"><h2>{t('yourStart')}</h2><Say k="yourStart" /><AssessmentResult recommended={d.assessment.recommended} scores={d.assessment.scores} needsConfirmation={d.assessment.needs_confirmation} />
            <Link className="ad-btn primary" to="/adult/courses">{t('goLessons')}</Link></div>}
      {Object.keys(COURSES).map((slug) => <CourseCard key={slug} slug={slug} />)}
      <Link className="ad-btn" to="/adult/progress">{t('myProgress')}</Link>
      <p className="ad-note">{t('lessonsSoon')}</p><Say k="lessonsSoon" />
    </main>
  )
}

// where a course opens: built-in courses have their own page; a course written in the dashboard opens at /adult/c/<slug>
const routeOf = (c) => (COURSES[c.slug] && COURSES[c.slug].route) || (c.origin === 'cms' ? '/adult/c/' + c.slug : null)

function CourseCard({ slug }) {
  const { t } = useAdult()
  const def = COURSES[slug]
  const d = useCourse(slug)
  if (d.loading || !d.enrolled) return null
  const sum = summarize(d.rows, def.lessons.map((l) => l.key))
  return (
    <div className="ad-card">
      <h2>{t(def.titleKey)}</h2>
      <p className="ad-big">{t('progressLine', { done: sum.completed, total: sum.total })}</p>
      <div className="ad-progress" aria-hidden="true"><i style={{ width: (sum.completed / sum.total) * 100 + '%' }} /></div>
      <Link className="ad-btn primary" to={def.route}>{sum.completed === 0 ? t('startHere') : t('continueLesson')}</Link>
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
      <h1>{t('tabCourses')}</h1><Say k="tabCourses" />
      {err && <p className="ad-error" role="alert">{err}</p>}
      {d.courses.map((c) => {
        const enrolled = d.enrolled.includes(c.id)
        return (
          <section className="ad-card" key={c.id}>
            <h2>{c.title[lang] || c.title.en}</h2>
            <p>{c.description[lang] || c.description.en}</p>
            {c.status === 'coming_soon' && <><p className="ad-note">{t('comingSoon')}</p><Say k="comingSoon" /></>}
            <p className="ad-note">{c.is_free ? t('payFree') : t('payPremium') + ' · ₦' + c.price_ngn.toLocaleString()}</p>
            {c.status === 'published' && !enrolled && c.is_free && <button className="ad-btn primary" disabled={busy === c.id} onClick={() => enroll(c.id)}>{t('joinFree')}</button>}
            {c.status === 'published' && !enrolled && !c.is_free && (<>{d.expired.includes(c.id) && <><p className="ad-error">{t('courseExpired')}</p><Say k="courseExpired" /></>}{routeOf(c) ? <Link className="ad-btn primary" to={routeOf(c)}>{t('payJoinHow')}</Link> : <><p className="ad-note">{t('lessonsNotYet')}</p><Say k="lessonsNotYet" /></>}</>)}
            {enrolled && d.ends[c.id] && <p className="ad-note">{t('courseUntil', { date: new Date(d.ends[c.id]).toLocaleDateString() })}</p>}
            {c.status === 'published' && enrolled && <><p className="ad-ok">{t('joined')}</p><Say k="joined" />{routeOf(c) ? <Link className="ad-btn primary" to={routeOf(c)}>{t('openLessons')}</Link> : <><p className="ad-note">{t('lessonsNotYet')}</p><Say k="lessonsNotYet" /></>}</>}
          </section>
        )
      })}
      <Link className="ad-link" to="/adult/payments">{t('payHistory')}</Link>
    </main>
  )
}

export function Practice() {
  const { t } = useAdult()
  return (
    <main className="ad-page">
      <h1>{t('tabWrite')}</h1>
      <p className="ad-note">{t('practiceNote')}</p><Say k="practiceNote" />
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
  const del = async () => { const f = await learnerApi.removeMyFiles(profile.id); if (f.error) { setMsg(t('errNetwork')); return }; const { error } = await learnerApi.deleteAccount(); if (error) { setMsg(t('errNetwork')); return }; await learnerApi.signOut(); nav('/adult') }
  return (
    <main className="ad-page">
      <h1>{t('tabHelp')}</h1>
      <div className="ad-card"><p className="ad-big">{t('helpText')}</p><Say k="helpText" big /></div>
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
