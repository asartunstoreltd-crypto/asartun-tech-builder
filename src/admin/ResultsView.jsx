import { useEffect, useState } from 'react'
import { missionTitles, ago } from './api2.js'

const STAGES = [['teach', 'Learn'], ['show', 'Watch'], ['practice', 'Practice'], ['challenge', 'Challenge'], ['quiz', 'Quiz'], ['finish', 'Finished']]
const stageOf = (e) => { const x = e.split(':')[1] || ''; return x.startsWith('quiz') ? 'quiz' : x.startsWith('challenge') ? 'challenge' : x.startsWith('show') ? 'show' : x.startsWith('practice') ? 'practice' : x }

// One learner's results: per mission, which parts are done, where they stopped, and which questions they got wrong.
export default function ResultsView({ data }) {
  const [titles, setTitles] = useState({})
  useEffect(() => { missionTitles().then(setTitles).catch(() => {}) }, [])
  const by = {}
  data.events.forEach((e) => { const [slug] = e.key.split(':'); (by[slug] ||= []).push(e) })
  const wrong = Object.fromEntries(data.wrong.map((w) => [w.key, w.count]))
  return (
    <div>
      <p><b>{data.nickname}</b> · age {data.age_band || '–'} · ⭐ {data.points} points · last active {ago(data.last_active_at)}</p>
      {data.badges.length > 0 && <p>🏅 {data.badges.join(', ')}</p>}
      {Object.keys(by).length === 0 && <p className="adm-empty">No lesson activity yet.</p>}
      {Object.entries(by).map(([slug, ev]) => {
        const done = new Set(ev.map((e) => stageOf(e.key)))
        const next = STAGES.find(([k]) => !done.has(k))
        const quizRight = ev.filter((e) => stageOf(e.key) === 'quiz' && e.key.includes(':quiz-')).length
        return (
          <div className="adm-sub" key={slug}>
            <b>{(titles[slug] && (titles[slug].en || titles[slug].ha)) || slug}</b>
            <div className="adm-chips">{STAGES.map(([k, n]) => <span key={k}>{done.has(k) ? '✅' : '⬜'} {n}</span>)}</div>
            <small>{next ? `Stopped before: ${next[1]}.` : 'Completed.'} Quiz answers correct: {quizRight}.</small>
          </div>
        )
      })}
      {data.wrong.length > 0 && (
        <div className="adm-sub"><b>Questions answered wrongly</b>
          <ul>{data.wrong.map((w) => <li key={w.key}>{w.key.replace(':quiz-', ' · question ')}: {w.count} wrong attempt(s)</li>)}</ul></div>
      )}
      {data.memberships && data.memberships.length > 0 && (
        <p className="adm-note">Groups: {data.memberships.map((m) => `${m.org}${m.class ? ' / ' + m.class : ''}${m.student_ref ? ' (' + m.student_ref + ')' : ''}`).join('; ')}</p>
      )}
      <small className="adm-note">Wrong attempts so far: {Object.values(wrong).reduce((a, b) => a + b, 0)}</small>
    </div>
  )
}
