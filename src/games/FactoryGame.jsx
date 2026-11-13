import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { stepNames } from '../data/missions'
import Confetti from '../components/Confetti'
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5)

// Tap steps in the right order. Steps are ids, so the language can change mid-game.
export default function FactoryGame({ product, onWin }) {
  const { t, L } = useLang()
  const [pool, setPool] = useState(() => shuffle(product.steps))
  const [picked, setPicked] = useState([])
  const [result, setResult] = useState(null)
  const pick = (s) => { setPicked([...picked, s]); setPool(pool.filter((x) => x !== s)); setResult(null) }
  const reset = () => { setPool(shuffle(product.steps)); setPicked([]); setResult(null) }
  const check = () => {
    const ok = picked.every((s, i) => s === product.steps[i])
    setResult(ok ? 'win' : 'try')
    if (ok) onWin()
  }
  return (
    <div className="card">
      <h3>{product.emoji} {t('factoryTitle', { name: L(product.name) })}</h3>
      <ol className="slots">{picked.map((s) => <li key={s}>{L(stepNames[s])}</li>)}</ol>
      <div className="chips">{pool.map((s) => <button key={s} className="chip" onClick={() => pick(s)}>{L(stepNames[s])}</button>)}</div>
      {pool.length === 0 && result !== 'win' && <button className="btn" onClick={check}>{t('checkOrder')}</button>}
      <button className="btn ghost" onClick={reset}>{t('again')}</button>
      {result === 'try' && <p className="bad">{t('orderWrong')}</p>}
      {result === 'win' && <><Confetti /><p className="good">{t('orderRight')}</p></>}
    </div>
  )
}
