import { useEffect, useRef, useState } from 'react'
import { useAdult } from '../AdultAuth.jsx'
import { audioExtension, signedAudioUrl, staffApi } from '../adultApi.js'
import { LIMITS, clipStale, getAudioClient, rawClip, wantedHash } from '../content.js'
import { loadContent } from '../contentLoader.js'

// Adult-admin tool: one recording for one text in one language. Record with the phone's microphone, or upload a file.
// The browser may use the microphone only after the admin allows it (and the page header permits it for this site only).
// Learners never see this screen. A recording is kept private; learners get a short-lived link only when they press Listen.
const MAX_SECONDS = 90
const FILE_TYPES = { 'audio/webm': 'audio/webm', 'audio/ogg': 'audio/ogg', 'audio/mpeg': 'audio/mpeg', 'audio/mp3': 'audio/mpeg', 'audio/mp4': 'audio/mp4', 'audio/aac': 'audio/aac', 'audio/wav': 'audio/wav', 'audio/x-wav': 'audio/wav', 'audio/x-m4a': 'audio/x-m4a', 'audio/m4a': 'audio/x-m4a' }
const REC_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

export const canRecord = () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof window !== 'undefined' && window.MediaRecorder)

function useRecorder() {
  const [state, setState] = useState('idle')          // idle | recording | ready | denied
  const [secs, setSecs] = useState(0)
  const [take, setTake] = useState(null)              // { blob, url, mime, ms }
  const rec = useRef(null); const chunks = useRef([]); const timer = useRef(null); const stream = useRef(null); const began = useRef(0)
  const cleanup = () => { clearInterval(timer.current); if (stream.current) stream.current.getTracks().forEach((t) => t.stop()); stream.current = null }
  useEffect(() => () => { cleanup(); if (rec.current && rec.current.state !== 'inactive') { rec.current.onstop = null; rec.current.stop() } }, [])
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url) }, [take])
  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      stream.current = s
      const type = REC_TYPES.find((x) => window.MediaRecorder.isTypeSupported(x)) || ''
      const r = new window.MediaRecorder(s, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 })     // small files: phones with little data
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.current.push(e.data) }
      r.onstop = () => {
        const ms = Date.now() - began.current; cleanup()
        const mime = (r.mimeType || type || 'audio/webm').split(';')[0]
        const blob = new Blob(chunks.current, { type: mime })
        setTake({ blob, url: URL.createObjectURL(blob), mime, ms }); setState('ready')
      }
      rec.current = r; began.current = Date.now(); setSecs(0); r.start(); setState('recording')
      timer.current = setInterval(() => { const n = Math.floor((Date.now() - began.current) / 1000); setSecs(n); if (n >= MAX_SECONDS && r.state !== 'inactive') r.stop() }, 250)
    } catch { cleanup(); setState('denied') }
  }
  const stop = () => { if (rec.current && rec.current.state !== 'inactive') rec.current.stop() }
  const discard = () => { setTake(null); setState('idle'); setSecs(0) }
  return { state, secs, take, start, stop, discard }
}

const ERR = { network: 'errNetwork', denied: 'errDenied', BADAUDIO: 'audErr' }

export default function AudioEditor({ keyName, lang }) {
  const { t } = useAdult()
  const r = useRecorder()
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  const playing = useRef(null)
  const clip = rawClip(lang, keyName); const stale = clipStale(lang, keyName)
  const hash = wantedHash(lang, keyName)            // a built-in word/sentence: the fingerprint of the words themselves; any other text: the fingerprint of its current text
  const refresh = async () => { await loadContent('staff') }
  const save = async ({ blob, mime, ms }) => {
    setBusy(true); setErr(''); setMsg('')
    if (!audioExtension(mime) || blob.size > LIMITS.audioBytes || (ms && ms > LIMITS.audioMs)) { setBusy(false); return setErr(t('audTooBig')) }
    const { error } = await staffApi.uploadAudio({ key: keyName, lang, blob, mime, durationMs: ms ? Math.max(1, Math.round(ms)) : null, textHash: hash })
    setBusy(false)
    if (error) return setErr(t(ERR[error] || 'errGeneric'))
    r.discard(); setMsg(t('audSaved')); await refresh()
  }
  const upload = async (ev) => {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = ''
    if (!f) return
    const mime = FILE_TYPES[f.type]
    if (!mime) return setErr(t('audBadType'))
    if (f.size > LIMITS.audioBytes) return setErr(t('audTooBig'))
    const url = URL.createObjectURL(f)
    const ms = await new Promise((res) => { const a = new Audio(url); a.onloadedmetadata = () => res(Number.isFinite(a.duration) ? Math.round(a.duration * 1000) : null); a.onerror = () => res(null) })
    URL.revokeObjectURL(url)
    await save({ blob: f, mime, ms })
  }
  const play = async () => {
    if (!clip) return
    if (playing.current) { playing.current.pause(); playing.current = null }
    const url = await signedAudioUrl(getAudioClient(), clip.path)
    if (!url) return setErr(t('audErr'))
    playing.current = new Audio(url); playing.current.play().catch(() => setErr(t('audErr')))
  }
  const remove = async () => { setBusy(true); setErr(''); const { error } = await staffApi.deleteAudio(keyName, lang); setBusy(false); if (error) return setErr(t(ERR[error] || 'errGeneric')); setMsg(''); await refresh() }
  const confirm = async () => { setBusy(true); const { error } = await staffApi.confirmAudio(keyName, lang, hash); setBusy(false); if (error) return setErr(t(ERR[error] || 'errGeneric')); await refresh() }
  return (
    <div className="ad-audio-editor">
      <p className="ad-note"><strong>{t('audTitle')} ({lang === 'ha' ? 'Hausa' : 'English'})</strong>: {clip ? t('audHas', { s: clip.duration_ms ? Math.round(clip.duration_ms / 1000) : '?' }) : t('audNone')}</p>
      {clip && <button type="button" className="ad-btn" onClick={play}>{t('audPlay')}</button>}
      {stale && <div className="ad-banner"><p>{t('audStale')}</p><button type="button" className="ad-btn" disabled={busy} onClick={confirm}>{t('audConfirm')}</button></div>}
      {r.state === 'recording' && <><p className="ad-big" role="status">{t('audRecording', { s: r.secs })}</p><button type="button" className="ad-btn primary" onClick={r.stop}>{t('audStop')}</button></>}
      {r.state === 'ready' && r.take && (
        <div className="ad-card"><audio controls src={r.take.url} style={{ width: '100%' }} />
          <button type="button" className="ad-btn primary" disabled={busy} onClick={() => save(r.take)}>{t('audSave')}</button>
          <button type="button" className="ad-link" onClick={r.discard}>{t('audDiscard')}</button></div>)}
      {r.state === 'idle' && (canRecord()
        ? <button type="button" className="ad-btn" disabled={busy} onClick={r.start}>{t('audRecord')}</button>
        : <p className="ad-note">{t('audNoMic')}</p>)}
      {r.state === 'denied' && <><p className="ad-error" role="alert">{t('audMicDenied')}</p><button type="button" className="ad-btn" onClick={r.discard}>{t('audRecord')}</button></>}
      {r.state !== 'recording' && <label className="ad-btn ad-file">{t('audUpload')}<input type="file" accept="audio/*" onChange={upload} style={{ display: 'none' }} /></label>}
      {clip && r.state === 'idle' && <button type="button" className="ad-link" disabled={busy} onClick={remove}>{t('audDelete')}</button>}
      <p className="ad-note">{t('audTip')}</p>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
    </div>
  )
}
