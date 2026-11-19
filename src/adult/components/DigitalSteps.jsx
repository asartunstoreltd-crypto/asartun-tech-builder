import { useState } from 'react'
import { useAdult } from '../AdultAuth.jsx'
import { SCREENS } from '../digital.js'

// A generic, drawn phone screen (no real app logos). Elements marked 'btn' can be touched; 'decor' ones are only drawn.
// Used by the "tap the right place" step of the digital literacy course. Marked automatically; nothing is typed.
const FILL = { green: '#1d6b3a', red: '#a32020', dark: '#1b2733' }

// break a label into lines that fit the width of its box
function wrap(text, w, size) {
  const max = Math.max(4, Math.floor(w / (size * 0.56)))
  const words = String(text).split(' '); const lines = []; let cur = ''
  for (const word of words) { if ((cur + ' ' + word).trim().length > max && cur) { lines.push(cur); cur = word } else cur = (cur + ' ' + word).trim() }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

export function PhoneScreen({ screen, picked, target, onTap }) {
  const { t } = useAdult()
  const els = SCREENS[screen] || []
  return (
    <svg className="ad-phone" viewBox="0 0 200 330" role="group" aria-label={t('dlScreenLabel')}>
      <rect x="2" y="2" width="196" height="326" rx="22" className="ad-phone-frame" />
      {els.map((e) => {
        const label = t(e.labelKey)
        const dark = e.color === 'dark' || e.color === 'green' || e.color === 'red'
        const state = picked ? (e.id === target ? 'right' : e.id === picked ? 'wrong' : '') : ''
        const small = e.w < 56 || e.h < 40
        const size = small ? 9 : 11
        const showIcon = e.icon && e.icon !== label
        const lines = wrap(label, e.w - 6, size)
        const tall = e.h >= 46
        const body = (
          <>
            <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="8" className={'ad-el ' + e.kind + (state ? ' ' + state : '')} style={dark ? { fill: FILL[e.color], stroke: FILL[e.color] } : undefined} />
            {showIcon && <text x={e.x + e.w / 2} y={tall ? e.y + 18 : e.y + e.h / 2 + 4} textAnchor="middle" fontSize={tall ? 16 : 11} aria-hidden="true" style={dark ? { fill: '#fff' } : undefined}>{e.icon}</text>}
            <text textAnchor="middle" fontSize={size} className="ad-el-label" style={dark ? { fill: '#fff' } : undefined}>
              {lines.map((ln, i) => <tspan key={i} x={e.x + e.w / 2} y={(showIcon && tall ? e.y + 31 : e.y + e.h / 2 - ((lines.length - 1) * (size + 1)) / 2 + 3) + i * (size + 1)}>{ln}</tspan>)}
            </text>
          </>
        )
        return e.kind === 'btn'
          ? <g key={e.id} role="button" tabIndex={picked ? -1 : 0} aria-label={label} className="ad-hot" onClick={() => onTap(e.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onTap(e.id) } }}>{body}</g>
          : <g key={e.id} aria-hidden="true">{body}</g>
      })}
    </svg>
  )
}

export function TapStep({ step, onAnswer, onNext }) {
  const { t } = useAdult()
  const [picked, setPicked] = useState(null)
  const pick = (id) => { if (picked) return; setPicked(id); onAnswer({ type: 'pick', ok: id === step.target }) }
  return (
    <>
      <p className="ad-big">{t(step.askKey)}</p>
      <p className="ad-note">{t('dlTapHint')}</p>
      <PhoneScreen screen={step.screen} picked={picked} target={step.target} onTap={pick} />
      {picked && (picked === step.target ? <p className="ad-ok ad-big" role="status">{t('dlTapRight')}</p> : <p className="ad-note ad-big" role="status">{t('dlTapWrong')}</p>)}
      {picked && <button className="ad-btn primary" onClick={onNext}>{t('next')}</button>}
    </>
  )
}
