import { useEffect, useRef, useState } from 'react'
import { getAudio } from '../../lib/narration.js'
import { useAdult } from '../AdultAuth.jsx'
import { speak, stopSpeaking, useVoices, hasVoice } from '../speech.js'
import { clipFor, coverage, getAudioClient } from '../content.js'
import { signedAudioUrl } from '../adultApi.js'

// Plays sound for a piece of text. Order: (1) a recording the admin made or uploaded in the dashboard for this text key (audioKey), if the text has not
// changed since, (2) a recording named adult.<id> if one was added to src/assets/audio/<lang>/, (3) the phone's own voice for that language.
// If none exists the button is NOT shown.
//   id    recording name (optional)       text  what the phone voice should say (optional)      audioKey  the text key, to find a dashboard recording (optional)
//   lang  language of the text: defaults to the interface language; pass 'ha' for Hausa words.
let current = null
export const hasAdultAudio = (lang, id) => Boolean(getAudio(lang, 'adult.' + id))

const urlCache = new Map()      // storage path -> { url, until }
async function clipUrl(path) {
  const hit = urlCache.get(path)
  if (hit && hit.until > Date.now()) return hit.url
  const url = await signedAudioUrl(getAudioClient(), path)
  if (url) urlCache.set(path, { url, until: Date.now() + 50 * 60 * 1000 })
  return url
}

export default function AdultAudio({ id, text, lang, audioKey, big = false }) {
  const { lang: uiLang, t, profile } = useAdult()
  useVoices()                                          // re-render when the phone's voices finish loading
  const [playing, setPlaying] = useState(false)
  const ref = useRef(null)
  const l = lang || uiLang
  const file = id ? getAudio(l, 'adult.' + id) : null
  const clip = audioKey ? clipFor(l, audioKey) : null
  const canSpeak = Boolean(text) && hasVoice(l)
  useEffect(() => () => { if (current === ref.current) { ref.current?.pause?.(); stopSpeaking() } }, [])
  if ((!file && !clip && !canSpeak) || (profile && profile.audio_on === false)) return null
  const toggle = () => {
    if (playing) { ref.current?.pause?.(); stopSpeaking(); setPlaying(false); return }
    if (current && current !== ref.current) current.pause?.()
    stopSpeaking()
    if (clip) {                                                       // the admin's recording; if it cannot be fetched, fall back to the phone's voice
      clipUrl(clip.path).then((url) => {
        if (!url) { if (canSpeak) { setPlaying(true); if (!speak(text, l, () => setPlaying(false))) setPlaying(false) } return }
        ref.current = new Audio(url); ref.current.onended = () => setPlaying(false); ref.current.onpause = () => setPlaying(false)
        current = ref.current
        ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      })
    } else if (file) {
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
// `items` = what the course says aloud: if every item has a recording nothing is missing, so no note; if some do, the note says so.
export function VoiceHint({ items }) {
  const { t, lang, profile } = useAdult()
  const v = useVoices()
  if (lang !== 'ha' || !v.supported || v.hasHausa || (profile && profile.audio_on === false)) return null
  const cov = items ? coverage(items) : { total: 0, done: 0 }
  if (cov.total > 0 && cov.done >= cov.total) return null
  return <p className="ad-banner">{t(cov.done > 0 ? 'voicePartial' : 'voiceMissing')}</p>
}
