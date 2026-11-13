import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { activityLabels } from '../data/quizzes'
import { badges } from '../data/missions'
import { content } from '../data/registry'

export default function Parent({ state }) {
  const { t, L } = useLang()
  const [a] = useState(() => 2 + Math.floor(Math.random() * 8))
  const [b] = useState(() => 3 + Math.floor(Math.random() * 7))
  const [ans, setAns] = useState('')
  const [open, setOpen] = useState(false)
  if (!open) return (
    <div className="page">
      <h2>{t('parentTitle')}</h2>
      <div className="card">
        <p>{t('grownups', { a, b })}</p>
        <input className="input" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value)} />
        <button className="btn" onClick={() => Number(ans) === a + b ? setOpen(true) : setAns('')}>{t('enter')}</button>
      </div>
    </div>
  )
  const list = Object.values(content).map((m) => {
    const total = 2 + 2 * m.procedures.length + m.challenges.length
    const n = state.earned.filter((k) => k.startsWith(m.id + ':') && !k.includes(':quiz')).length
    return { m, pct: Math.min(100, Math.round((n / total) * 100)), done: state.earned.includes(m.id + ':finish') }
  })
  const label = (k) => {
    const s = k.split(':')[1]
    if (!s) return L(activityLabels[k.startsWith('quiz') ? 'quiz' : k]) || k
    return s.startsWith('quiz') ? L(activityLabels.quiz) : t('act_' + s.split('-')[0])
  }
  const acts = state.earned.map(label)
  const badgeNames = state.badges.map((id) => L((badges.find((x) => x.id === id) || {}).name) || id)
  return (
    <div className="page">
      <h2>{t('parentTitle')}</h2>
      <div className="card">
        <p>{t('learner')}: <b>{state.nick}</b> {t('nickOnly')}</p>
        {list.map((x) => (
          <div key={x.m.id}>
            <p className="small">{t('mission')} {String(x.m.no).padStart(2, '0')} — {L(x.m.title)}: {x.pct}% {x.done ? '✅' : ''}</p>
            <div className="progress"><div style={{ width: x.pct + '%' }} /></div>
          </div>
        ))}
        <p>{t('completedM')}: <b>{list.filter((x) => x.done).length}</b> · {t('ptsLabel')}: <b>{state.points}</b></p>
        <p>{t('badgesLabel')}: {badgeNames.length ? badgeNames.join(', ') : t('none')}</p>
      </div>
      <div className="card"><h3>{t('activities')}</h3>
        {acts.length ? <ul>{acts.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>{t('noAct')}</p>}
      </div>
      <div className="warn">{t('safetyNote')}</div>
      <p className="small">{t('localNote')}</p>
    </div>
  )
}
