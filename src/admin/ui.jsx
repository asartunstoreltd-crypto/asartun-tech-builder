import { useState } from 'react'
import { blank, stageLabel } from './api.js'

export const Field = ({ label, children, hint }) => (
  <label className="adm-f"><span className="adm-fl">{label}</span>{children}{hint && <small>{hint}</small>}</label>
)

// Hausa + English side by side. Every learner-facing text uses this, so a translation is never forgotten.
export function Bi({ label, value, onChange, rows }) {
  const v = value || blank()
  const set = (l, x) => onChange({ ...v, [l]: x })
  const input = (l) => (rows
    ? <textarea rows={rows} value={v[l] || ''} onChange={(e) => set(l, e.target.value)} />
    : <input value={v[l] || ''} onChange={(e) => set(l, e.target.value)} />)
  return (
    <div className="adm-bi"><span className="adm-fl">{label}</span>
      <div><b>HAUSA</b>{input('ha')}</div>
      <div><b>ENGLISH</b>{input('en')}</div>
    </div>
  )
}

export const StatusBadge = ({ status }) => <span className={'adm-badge s-' + status}>{stageLabel[status] || status}</span>

export function Confirm({ title, children, yesText = 'Yes, delete', phrase, onYes, onNo }) {
  const [typed, setTyped] = useState('')
  return (
    <div className="adm-modal"><div className="adm-card">
      <h3>{title}</h3>{children}
      {phrase && <label className="adm-f"><span>Type <b>{phrase}</b> to confirm</span><input value={typed} onChange={(e) => setTyped(e.target.value)} /></label>}
      <div className="adm-actions">
        <button className="adm-btn danger" disabled={Boolean(phrase) && typed !== phrase} onClick={onYes}>{yesText}</button>
        <button className="adm-btn ghost" onClick={onNo}>Cancel</button>
      </div>
    </div></div>
  )
}

// Reorderable list: drag the ⠿ handle (computers) or use ↑ ↓ (phones). Each item can be duplicated or deleted.
export function SortList({ items, setItems, keyOf, title, render, duplicate, remove }) {
  const [drag, setDrag] = useState(null)
  const move = (from, to) => {
    if (from === null || to < 0 || to >= items.length || from === to) return
    const a = [...items]
    const [x] = a.splice(from, 1)
    a.splice(to, 0, x)
    setItems(a)
  }
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn() }
  return items.map((it, i) => (
    <details key={keyOf(it)} className={'adm-blk' + (drag === i ? ' drag' : '')} open={it._open ? true : undefined}
      onDragOver={(e) => e.preventDefault()} onDrop={() => { move(drag, i); setDrag(null) }}>
      <summary>
        <span className="adm-grip" draggable title="Drag to reorder" onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); setDrag(i) }} onDragEnd={() => setDrag(null)}>⠿</span>
        <span className="adm-ttl"><b>{i + 1}.</b> {title(it, i)}</span>
        <span className="adm-tools">
          <button type="button" title="Move up" disabled={i === 0} onClick={stop(() => move(i, i - 1))}>↑</button>
          <button type="button" title="Move down" disabled={i === items.length - 1} onClick={stop(() => move(i, i + 1))}>↓</button>
          {duplicate && <button type="button" title="Duplicate" onClick={stop(() => duplicate(i))}>⧉</button>}
          {remove && <button type="button" title="Delete" onClick={stop(() => remove(i))}>🗑</button>}
        </span>
      </summary>
      <div className="adm-blkbody">{render(it, i)}</div>
    </details>
  ))
}
