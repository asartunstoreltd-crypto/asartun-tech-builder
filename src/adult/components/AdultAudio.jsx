import { useRef, useState } from 'react'
import { getAudio } from '../../lib/narration.js'
import { useAdult } from '../AdultAuth.jsx'

// Plays a recording named adult.<id> from src/assets/audio/<lang>/ (same folder the children's app uses).
// If no recording exists the button is NOT shown: nothing is faked with a synthetic voice.
let current = null
export const hasAdultAudio = (lang, id) => Boolean(getAudio(lang, 'adult.' + id))

export default function AdultAudio({ id, big = false }) {
  const { lang, t, profile } = useAdult()
  const [playing, setPlaying] = useState(false)
  const ref = useRef(null)
  const src = getAudio(lang, 'adult.' + id)
  if (!src || (profile && profile.audio_on === false)) return null
  const toggle = () => {
    if (current && current !== ref.current) { current.pause(); current.currentTime = 0 }
    if (!ref.current) { ref.current = new Audio(src); ref.current.onended = () => setPlaying(false); ref.current.onpause = () => setPlaying(false) }
    current = ref.current
    if (playing) { ref.current.pause(); return }
    ref.current.currentTime = 0
    ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }
  return <button type="button" className={'ad-listen' + (big ? ' big' : '')} onClick={toggle}>{playing ? t('stop') : t('listen')}</button>
}
