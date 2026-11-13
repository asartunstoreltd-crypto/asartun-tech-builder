import { Fragment, useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import AudioButton from './AudioButton'

// SHOW stage: animated step-by-step demo with arrows, highlight, controls and replay.
// items: [{emoji, name:{ha,en}, text:{ha,en}}]  result: {emoji,name}  summary: {ha,en}
export default function ProcessDemo({ items, result, summary, onFinished }) {
  const { t, L } = useLang()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const fired = useRef(false)
  const last = items.length - 1
  useEffect(() => {
    if (!playing) return undefined
    const id = setTimeout(() => { if (i < last) setI(i + 1); else setPlaying(false) }, 3500)
    return () => clearTimeout(id)
  }, [playing, i, last])
  useEffect(() => {
    if (i === last && !fired.current) { fired.current = true; if (onFinished) onFinished() }
  }, [i, last, onFinished])
  const go = (n) => { setPlaying(false); setI(Math.max(0, Math.min(last, n))) }
  const cur = items[i]
  return (
    <div className="card">
      <div className="flow">
        {items.map((s, n) => (
          <Fragment key={n}>
            <button className={'node' + (n === i ? ' now' : n < i ? ' past' : '')} onClick={() => go(n)} aria-label={L(s.name)}>{s.emoji}</button>
            <span className={'arrow' + (n < i ? ' past' : '')}>➜</span>
          </Fragment>
        ))}
        <span className={'node end' + (i === last ? ' now' : '')}>{result.emoji}</span>
      </div>
      <div className="stagebox" key={i}>
        {cur.imageUrl ? <img className="mimg" src={cur.imageUrl} alt="" /> : <div className="big bounce">{cur.emoji}</div>}
        <p className="small">{t('stepN', { n: i + 1 })} / {items.length}</p>
        <h3>{L(cur.name)}</h3>
        <p>{L(cur.text)}</p>
        {cur.id && <AudioButton id={cur.id} />}
        <p className={cur.kid ? 'kid' : 'adult'}>{cur.kid ? t('kidOk') : t('adultOnly')}</p>
      </div>
      <div className="controls">
        <button className="btn ghost" onClick={() => go(i - 1)} disabled={i === 0}>{t('prevStep')}</button>
        <button className="btn ghost" onClick={() => (i === last && !playing ? setPlaying(false) : setPlaying(!playing))} disabled={i === last}>{playing ? t('pause') : t('play')}</button>
        <button className="btn ghost" onClick={() => go(i + 1)} disabled={i === last}>{t('nextStep')}</button>
        <button className="btn" onClick={() => { setI(0); setPlaying(true) }}>{t('replay')}</button>
      </div>
      {i === last && (
        <div className="result">
          <b>{result.emoji} {L(result.name)}</b>
          <p><b>{t('diffTitle')}:</b> {L(summary)}</p>
        </div>
      )}
    </div>
  )
}
