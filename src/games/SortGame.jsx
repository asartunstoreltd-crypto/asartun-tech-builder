import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'

// Two-choice sorting challenge. Default: resource or new product?
// Pass `options` and `askKey` for other topics (see the safety challenge in MissionEngine).
const defaultOptions = [{ kind: 'resource', labelKey: 'resource', icon: '🌍' }, { kind: 'product', labelKey: 'product', icon: '📦' }]

export default function SortGame({ items, onDone, options = defaultOptions, askKey = 'sortAsk' }) {
  const { t, L } = useLang()
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const [finished, setFinished] = useState(false)
  const item = items[i]
  if (finished) return <div className="card center-text"><div className="big bounce">✅</div><p className="good">{t('sortDone')}</p></div>
  const advance = () => { if (i + 1 < items.length) { setI(i + 1); setFb(null) } else { setFinished(true); onDone() } }
  return (
    <div className="card center-text">
      <p className="small">{i + 1} / {items.length}</p>
      <div className="big bounce">{item.emoji}</div>
      <h3>{L(item.name)}</h3>
      <p>{t(askKey)}</p>
      {fb !== 'ok' && <div className="two">
        {options.map((o, n) => (
          <button key={o.kind} className={'btn' + (n === 1 ? ' alt' : '')} onClick={() => setFb(item.kind === o.kind ? 'ok' : 'no')}>{o.icon} {t(o.labelKey)}</button>
        ))}
      </div>}
      {fb === 'no' && <p className="bad">{t('sortWrong')} {L(item.why)}</p>}
      {fb === 'ok' && <><p className="good">{t('sortRight')} {L(item.why)}</p><button className="btn" onClick={advance}>{t('next')}</button></>}
    </div>
  )
}
