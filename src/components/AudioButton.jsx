import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { getAudio } from '../lib/narration.js'

let current = null // only one narration plays at a time

// Plays the recording for narration `id` in the current language.
// No recording file for that id and language = the button stays disabled. Nothing is faked.
export default function AudioButton({ id }) {
  const { t, lang } = useLang()
  const src = id ? getAudio(lang, id) : null
  const [on, setOn] = useState(false)
  const ref = useRef(null)
  useEffect(() => () => { if (ref.current) ref.current.pause() }, [])
  useEffect(() => { if (ref.current) { ref.current.pause(); ref.current = null } setOn(false) }, [src])
  const toggle = () => {
    if (on && ref.current) { ref.current.pause(); setOn(false); return }
    if (current) current.pause()
    const a = new Audio(src)
    ref.current = a; current = a
    a.onended = () => setOn(false)
    a.play().then(() => setOn(true)).catch(() => setOn(false))
  }
  return (
    <button className="audio" disabled={!src} onClick={toggle} title={src ? t('listen') : t('listenSoon')} aria-label={t('listen')}>
      {on ? '⏹' : '🔊'} <span>{on ? t('stopAudio') : t('listen')}</span>
    </button>
  )
}
