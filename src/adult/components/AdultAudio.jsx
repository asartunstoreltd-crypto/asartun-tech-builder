import { useEffect, useRef, useState } from 'react'
import { getAudio } from '../../lib/narration.js'
import { useAdult } from '../AdultAuth.jsx'
import { speak, stopSpeaking, useVoices, hasVoice } from '../speech.js'

// Plays sound for a piece of text. Order: (1) a recording named adult.<id> if one was added to src/assets/audio/<lang>/,
// (2) the phone's own voice for that language. If neither exists the button is NOT shown.
//   id    recording name (optional)       text  what the phone voice should say (optional)
//   lang  language of the text: defaults to the interface language; pass 'ha' for Hausa words.
let current = null
export const hasAdultAudio = (lang, id) => Boolean(getAudio(lang, 'adult.' + id))

export default function AdultAudio({ id, text, lang, big = false }) {
  const { lang: uiLang, t, profile } = useAdult()
  useVoices()                                          // re-render when the phone's voices finish loading
  const [playing, setPlaying] = useState(false)
  const ref = useRef(null)
  const l = lang || uiLang
  const file = id ? getAudio(l, 'adult.' + id) : null
  const canSpeak = Boolean(text) && hasVoice(l)
  useEffect(() => () => { if (current === ref.current) { ref.current?.pause?.(); stopSpeaking() } }, [])
  if ((!file && !canSpeak) || (profile && profile.audio_on === false)) return null
  const toggle = () => {
    if (playing) { ref.current?.pause?.(); stopSpeaking(); setPlaying(false); return }
    if (current && current !== ref.current) current.pause?.()
    stopSpeaking()
    if (file) {
      if (!ref.current) { ref.current = new Audio(file); ref.current.onended = () => setPlaying(false); ref.current.onpause = () => setPlaying(false) }
      current = ref.current; ref.current.currentTime = 0
      ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      setPlaying(true)
      if (!speak(text, l, () => setPlaying(false))) setPlaying(false)
    }
  }
  return (
    <button type="button" className={'ad-listen' + (big ? ' big' : '')} onClick={toggle} aria-pressed={playing}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z" /><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      {playing ? t('stop') : t('listen')}
    </button>
  )
}

// A short note, shown only when the phone has no Hausa voice, so the missing buttons are explained.
export function VoiceHint() {
  const { t, lang, profile } = useAdult()
  const v = useVoices()
  if (lang !== 'ha' || !v.supported || v.hasHausa || (profile && profile.audio_on === false)) return null
  return <p className="ad-banner">{t('voiceMissing')}</p>
}
