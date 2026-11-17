// The phone's own text-to-speech (Web Speech API). Nothing is downloaded and no network is used.
// Rule: a language is spoken ONLY if the phone has a voice for that language. Reading Hausa with an English voice would
// teach wrong pronunciation, so when no Hausa voice is installed the listen button is simply not shown (and the app
// tells the learner how to add a voice).  Whether a given phone has a Hausa voice, and how well it pronounces
// ɓ ɗ ƙ ƴ, can only be found out on that phone.
import { useEffect, useState } from 'react'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
export const speechSupported = Boolean(synth)

const norm = (l) => String(l || '').toLowerCase().replace('_', '-')
export const voiceFor = (lang) => (synth ? synth.getVoices().find((v) => norm(v.lang) === lang || norm(v.lang).startsWith(lang + '-')) || null : null)
export const hasVoice = (lang) => Boolean(voiceFor(lang))

export function stopSpeaking() { try { synth?.cancel() } catch { /* ignore */ } }
export function speak(text, lang, onEnd) {
  const v = voiceFor(lang)
  if (!synth || !v || !text) { onEnd?.(false); return false }
  try {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v; u.lang = v.lang; u.rate = 0.85            // slower than normal speech
    u.onend = () => onEnd?.(true); u.onerror = () => onEnd?.(false)
    synth.speak(u)
    return true
  } catch { onEnd?.(false); return false }
}

// Voices load a moment after the page opens on most phones; re-render when they arrive.
export function useVoices() {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!synth) return undefined
    const h = () => bump((n) => n + 1)
    synth.addEventListener?.('voiceschanged', h)
    const t = setTimeout(h, 800)                           // some browsers never fire the event
    return () => { synth.removeEventListener?.('voiceschanged', h); clearTimeout(t) }
  }, [])
  return { hasHausa: hasVoice('ha'), hasEnglish: hasVoice('en'), supported: speechSupported }
}
