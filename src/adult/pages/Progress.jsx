import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import { lessonByKey } from '../courses.js'
import { AREAS, T, learnerView, weeklySeries } from '../reports.js'

// The learner's own progress: what they can do, said plainly. No points, no ranks, no comparison with anyone, no "support" flags
// (those are for teachers). Everything here comes from the learner's own records.
const SELF_KEY = { none: 'mlvNone', early: 'mlvEarly', building: 'mlvBuilding', developing: 'mlvDeveloping', secure: 'mlvSecure' }
const AREA_KEY = { read: 'skRead', write: 'skWrite', count: 'skCount', apply: 'skApply' }
const UNITS = [['letters', 'mpLetters'], ['words', 'mpWords'], ['sentences', 'mpSentences'], ['digits', 'mpDigits'], ['calc', 'mpCalc'], ['applied', 'mpApplied']]

export default function Progress() {
  const { t } = useAdult()
  const [d, setD] = useState(null); const [err, setErr] = useState(false)
  useEffect(() => { learnerApi.myReport().then(({ data, error }) => (error ? setErr(true) : setD(data))) }, [])
  const v = useMemo(() => (d ? learnerView(d.prog, d.att, d.subs, d.now) : null), [d])
  const weeks = useMemo(() => (d ? weeklySeries({ prog: d.prog, att: d.att, subs: d.subs }, d.now) : []), [d])
  if (err) return <main className="ad-page ad-center"><p className="ad-error">{t('errNetwork')}</p><Link className="ad-btn" to="/adult/home">{t('back')}</Link></main>
  if (!v) return <main className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></main>
  const max = Math.max(1, ...weeks.map((w) => w.completed))
  const next = v.next ? lessonByKey(v.next) : null
  return (
    <main className="ad-page">
      <h1>{t('myProgress')}</h1>
      {!v.anyProgress && v.attendance.marked === 0 ? <div className="ad-card"><p className="ad-big">{t('mpNothing')}</p><Link className="ad-btn primary" to="/adult/courses">{t('goLessons')}</Link></div> : (
        <>
          <p className="ad-big">{t('mpIntro')}</p>
          <div className="ad-card">
            {UNITS.filter(([k]) => v[k].done > 0).map(([k, name]) => (
              <div key={k}><p>{t('mpUnit', { name: t(name), done: v[k].done, of: v[k].total, solid: v[k].solid })}</p><div className="ad-progress" aria-hidden="true"><i style={{ width: (v[k].done / v[k].total) * 100 + '%' }} /></div></div>))}
            {v.writtenTotal > 0 && <p>{t('mpWritten', { right: v.writtenRight, total: v.writtenTotal })}</p>}
            <p className="ad-note">{t('mpSolidNote')}</p>
          </div>
          <div className="ad-card">
            <h2>{t('mpCanDo')}</h2>
            {AREAS.filter((a) => v.areas[a].level !== 'none').map((a) => <p key={a}><strong>{t(AREA_KEY[a])}:</strong> {t(SELF_KEY[v.areas[a].level])}</p>)}
          </div>
          {v.practise.length > 0 && (
            <div className="ad-card"><h2>{t('mpPractise')}</h2>
              <ul className="ad-rules">{v.practise.map((k) => { const l = lessonByKey(k); return <li key={k}><Link to={'/adult/learn/' + k}>{l ? t(l.title.key, l.title.vars) : k}</Link></li> })}</ul></div>)}
          {(v.attendance.marked > 0 || v.markedWork > 0) && (
            <div className="ad-card">
              {v.attendance.marked > 0 && <p>{t('mpAttendance', { n: v.attendance.attended, of: v.attendance.marked })}</p>}
              {v.markedWork > 0 && <p>{t('mpWork', { n: v.markedWork })}</p>}
            </div>)}
          <div className="ad-card">
            <h2>{t('mpWeeks')}</h2>
            <div className="ad-bars" role="img" aria-label={t('mpWeeks')}>{weeks.map((w) => <div key={w.week}><i style={{ height: (w.completed / max) * 100 + '%' }} /><span>{w.completed}</span></div>)}</div>
          </div>
          {next && <div className="ad-card"><h2>{t('mpNext')}</h2><Link className="ad-btn primary" to={'/adult/learn/' + next.key}>{t(next.title.key, next.title.vars)}</Link></div>}
          <p className="ad-note">{t('mpNote')}</p>
        </>)}
      <Link className="ad-link" to="/adult/home">{t('back')}</Link>
    </main>
  )
}
