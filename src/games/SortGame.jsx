import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'

// Sorting challenge: tap the group an item belongs to. Default: resource or new product?
// `options` = groups. Each: {kind, icon, labelKey} (built-in text) or {kind, icon, label:{ha,en}} (admin-made).
// `ask` = {ha,en} question text (admin-made) or `askKey` (built-in).
const defaultOptions = [{ kind: 'resource', labelKey: 'resource', icon: '🌍' }, { kind: 'product', labelKey: 'product', icon: '📦' }]

export default function SortGame({ items, onDone, options = defaultOptions, askKey = 'sortAsk', ask }) {
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
      {item.imageUrl ? <img className="mimg" src={item.imageUrl} alt="" /> : <div className="big bounce">{item.emoji}</div>}
      <h3>{L(item.name)}</h3>
      <p>{ask ? L(ask) : t(askKey)}</p>
      {fb !== 'ok' && <div className="two">
        {options.map((o, n) => (
          <button key={o.kind} className={'btn' + (n % 2 === 1 ? ' alt' : '')} onClick={() => setFb(item.kind === o.kind ? 'ok' : 'no')}>{o.icon} {o.label ? L(o.label) : t(o.labelKey)}</button>
        ))}
      </div>}
      {fb === 'no' && <p className="bad">{t('sortWrong')} {L(item.why)}</p>}
      {fb === 'ok' && <><p className="good">{t('sortRight')} {L(item.why)}</p><button className="btn" onClick={advance}>{t('next')}</button></>}
    </div>
  )
}
