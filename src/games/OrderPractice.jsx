import { Fragment, useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import Confetti from '../components/Confetti'
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5)

// PRACTICE stage: tap steps in order. Wrong taps only give a friendly nudge and a hint.
export default function OrderPractice({ procedure, steps, onDone }) {
  const { t, L } = useLang()
  const seq = procedure.steps
  const [pool, setPool] = useState(() => shuffle(seq))
  const [n, setN] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [hint, setHint] = useState(false)
  const [shake, setShake] = useState(null)
  const finished = n === seq.length
  useEffect(() => { if (finished) onDone() }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps
  const placed = seq.slice(0, n)
  const tap = (id) => {
    if (id === seq[n]) { setN(n + 1); setWrong(0); setHint(false) }
    else { setWrong(wrong + 1); setShake(id); setTimeout(() => setShake(null), 500) }
  }
  const reset = () => { setPool(shuffle(seq)); setN(0); setWrong(0); setHint(false) }
  const showHint = hint || wrong >= 2
  return (
    <div className="card">
      <h3>{procedure.emoji} {L(procedure.name)}</h3>
      <div className="flow">
        {placed.map((id) => <Fragment key={id}><span className="node past">{steps[id].emoji}</span><span className="arrow past">➜</span></Fragment>)}
        {!finished && <span className="node empty">?</span>}
      </div>
      {!finished && (
        <>
          <div className="chips">
            {pool.filter((id) => !placed.includes(id)).map((id) => (
              <button key={id} className={'chip' + (shake === id ? ' shake' : '') + (showHint && id === seq[n] ? ' glow' : '')} onClick={() => tap(id)}>
                {steps[id].emoji} {L(steps[id].name)}
              </button>
            ))}
          </div>
          {wrong > 0 && <p className="bad">{t('practiceWrong')}</p>}
          <button className="btn ghost" onClick={() => setHint(true)}>{t('hint')}</button>
        </>
      )}
      <button className="btn ghost" onClick={reset}>{t('again')}</button>
      {finished && <><Confetti /><p className="good">{t('practiceDone')}</p></>}
    </div>
  )
}
