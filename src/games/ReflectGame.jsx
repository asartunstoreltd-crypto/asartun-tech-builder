import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'

// Design brief / project presentation: the child answers a few guiding questions in their own words.
// Saved to the child's portfolio (a teacher can read and assess it). Needs some real writing, not one letter.
export default function ReflectGame({ c, onDone, save }) {
  const { t, L } = useLang()
  const min = c.minChars || 15
  const [a, setA] = useState(() => c.prompts.map(() => ''))
  const [saved, setSaved] = useState(false)
  const ready = a.every((x) => x.trim().length >= min)
  const submit = () => {
    if (!ready) return
    if (save) save({ title: c.title, answers: c.prompts.map((p, i) => ({ q: p, a: a[i].trim().slice(0, 1000) })) })
    setSaved(true)
    onDone()
  }
  return (
    <div className="card">
      <h3>📝 {L(c.title)}</h3>
      <p className="warn">{t('reflectPrivacy')}</p>
      {c.prompts.map((p, i) => (
        <label className="field" key={i}>{L(p)}
          <textarea rows={3} maxLength={1000} disabled={saved} value={a[i]} onChange={(e) => setA(a.map((x, j) => (j === i ? e.target.value : x)))} style={{ width: '100%' }} />
        </label>
      ))}
      {!saved && <button className="btn" onClick={submit}>{t('reflectSave')}</button>}
      {!saved && !ready && <p className="small">{t('reflectNeed')}</p>}
      {saved && <p className="good">{t('reflectSaved')}</p>}
    </div>
  )
}
