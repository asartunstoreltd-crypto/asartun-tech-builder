import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'

// Science prediction: the child predicts FIRST, then sees the (model) result and the explanation.
// Points are given for making a prediction and reading the result: a wrong prediction is part of learning.
export default function PredictGame({ c, onDone, save }) {
  const { t, L } = useLang()
  const [pick, setPick] = useState(null)
  const [seen, setSeen] = useState(false)
  const right = pick === c.correct
  const check = () => {
    setSeen(true)
    if (save) save({ question: c.ask, options: c.options, pick, correct: c.correct, right })
    onDone()
  }
  return (
    <div className="card">
      <h3>🔮 {L(c.ask)}</h3>
      {c.options.map((o, i) => (
        <button key={i} className={'btn' + (pick === i ? '' : ' alt')} disabled={seen} onClick={() => setPick(i)}>{pick === i ? '✅ ' : ''}{L(o)}</button>
      ))}
      {!seen && <p className="small">{t('predictPick')}</p>}
      {!seen && pick !== null && <button className="btn" onClick={check}>{t('predictCheck')}</button>}
      {seen && (
        <div className="result">
          <p className={right ? 'good' : 'bad'}>{right ? t('predictRight') : t('predictWrong')}</p>
          {c.table && c.table.length > 0 && (
            <table className="tbl"><tbody>{c.table.map((r, i) => <tr key={i}><td>{L(r.label)}</td><td><b>{r.value}</b></td></tr>)}</tbody></table>
          )}
          <p>{L(c.explain)}</p>
          <p className="small">{t('modelNote')}</p>
        </div>
      )}
    </div>
  )
}
