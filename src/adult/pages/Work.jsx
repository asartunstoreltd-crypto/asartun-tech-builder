import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import { compressPhoto, photoPath, simplifyStrokes, validatePhoto } from '../imageTools.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import WorkViewer from '../components/WorkViewer.jsx'
import { STATE_KEY, canSend, workState } from '../work.js'

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now() + Math.random().toString(16).slice(2))
const errKey = (code) => ({ network: 'errNetwork', MARKED: 'errMarked', CLOSED_WORK: 'errClosedWork', ATTEMPTS: 'errAttempts', NOUPLOAD: 'errNoUpload', denied: 'errDenied', PHOTO_TYPE: 'errPhotoType', PHOTO_EMPTY: 'errPhotoType', PHOTO_BIG: 'errPhotoBig', PHOTO_DECODE: 'errPhotoDecode' }[code] || 'errGeneric')
const fmtDate = (d) => new Date(d).toLocaleDateString()
const labelsFor = (t) => ({ pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') })

function useWork() {
  const [d, setD] = useState({ loading: true, error: false, assignments: [], subs: [] })
  const load = useCallback(async () => {
    const [a, s] = await Promise.all([learnerApi.assignments(), learnerApi.mySubmissions()])
    setD({ loading: false, error: Boolean(a.error || s.error), assignments: a.data || [], subs: s.data || [] })
  }, [])
  useEffect(() => { load() }, [load])
  return { ...d, reload: load }
}

// The "Write" tab: work from the teacher, and the free practice area.
export function WorkList() {
  const { t } = useAdult()
  const d = useWork()
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  const latestOf = (id) => d.subs.filter((s) => s.assignment_id === id && s.status !== 'superseded').sort((x, y) => y.attempt_no - x.attempt_no)[0]
  return (
    <main className="ad-page">
      <h1>{t('workTitle')}</h1>
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      {d.assignments.length === 0 ? <p className="ad-note">{t('workNone')}</p> :
        <ul className="ad-lessons">{d.assignments.map((a) => { const st = workState(a, latestOf(a.id)); return (
          <li key={a.id}><Link to={'/adult/work/' + a.id} className={'ad-lesson' + (st === 'marked' ? ' done' : st === 'redo' || st === 'notSent' ? ' next' : '')}>
            <span style={{ flex: 1 }}><strong>{a.title}</strong>{a.due_at && <span className="ad-note" style={{ display: 'block' }}>{t('workDue', { date: fmtDate(a.due_at) })}</span>}</span>
            <span className="ad-tag">{t(STATE_KEY[st])}</span></Link></li>) })}</ul>}
      <Link className="ad-btn" to="/adult/practice">{t('practiceFree')}</Link>
    </main>
  )
}

export function WorkDetail() {
  const { id } = useParams()
  const { t } = useAdult()
  const d = useWork()
  const [mode, setMode] = useState(null)                       // null | 'write' | 'photo'
  const a = d.assignments.find((x) => x.id === id)
  const mine = useMemo(() => d.subs.filter((s) => s.assignment_id === id && s.status !== 'superseded').sort((x, y) => y.attempt_no - x.attempt_no), [d.subs, id])
  const latest = mine[0]
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (!a) return <main className="ad-page"><p className="ad-big">{t('errGeneric')}</p><Link className="ad-btn" to="/adult/write">{t('back')}</Link></main>
  const allowed = canSend(a, latest)
  const done = () => { setMode(null); d.reload() }
  return (
    <main className="ad-page">
      <Link className="ad-link" to="/adult/write">{t('back')}</Link>
      <h1>{a.title}</h1>
      {a.due_at && <p className="ad-note">{t('workDue', { date: fmtDate(a.due_at) })}</p>}
      {a.instructions && <div className="ad-card"><h2>{t('workInstructions')}</h2><p style={{ whiteSpace: 'pre-line' }}>{a.instructions}</p></div>}
      {latest && <Previous sub={latest} max={a.max_score} />}
      {mode === null && allowed && (
        <div className="ad-card">
          <h2>{t('workHow')}</h2>
          <div className="ad-stack">
            {a.kind !== 'photo' && <button className="ad-btn primary" onClick={() => setMode('write')}>{t('workWrite')}</button>}
            {a.kind !== 'handwriting' && <button className="ad-btn primary" onClick={() => setMode('photo')}>{t('workPhoto')}</button>}
          </div>
        </div>)}
      {mode === 'write' && <WriteWork assignment={a} onDone={done} onCancel={() => setMode(null)} />}
      {mode === 'photo' && <PhotoWork assignment={a} onDone={done} onCancel={() => setMode(null)} />}
    </main>
  )
}

// Shows the learner's newest attempt, and the teacher's marks and comment when there are any.
function Previous({ sub, max }) {
  const { t } = useAdult()
  const [detail, setDetail] = useState(null); const [url, setUrl] = useState(null); const [err, setErr] = useState(false)
  useEffect(() => {
    let off = false
    setDetail(null); setUrl(null); setErr(false)
    learnerApi.submissionDetail(sub.id).then(async ({ data, error }) => {
      if (off) return
      if (error || !data) { setErr(true); return }
      setDetail(data)
      if (data.kind === 'photo' && data.file_path) { const u = await learnerApi.signedUrl(data.file_path); if (!off) { if (u.error) setErr(true); else setUrl(u.data) } }
    })
    return () => { off = true }
  }, [sub.id, sub.status])
  const fb = detail?.feedback
  return (
    <div className="ad-card">
      <h2>{t('workAttempt', { n: sub.attempt_no })} · <span className="ad-note">{t({ submitted: 'workSent', reviewed: 'workMarked', redo: 'workRedo' }[sub.status] || 'workSent')}</span></h2>
      {err && <p className="ad-error">{t('errPhotoLoad')}</p>}
      {detail && (detail.kind === 'handwriting' || url) && <WorkViewer submission={detail} imageUrl={url} overlay={fb?.corrections} onImageError={() => setErr(true)} />}
      {detail && detail.kind === 'photo' && !url && !err && <p className="ad-note">{t('photoPreparing')}</p>}
      {fb && (<>
        {fb.score != null && <p className="ad-big">{t('workScore', { score: Number(fb.score), max })}</p>}
        {fb.comment && <><p className="ad-note">{t('workComment')}</p><p className="ad-big" style={{ whiteSpace: 'pre-line' }}>{fb.comment}</p></>}
        {fb.request_redo && <p className="ad-banner">{t('workRedo')}</p>}
      </>)}
    </div>
  )
}

// ---- send: write on the screen ----
function WriteWork({ assignment, onDone, onCancel }) {
  const { t } = useAdult()
  const cv = useRef(null)
  const client = useRef(newId())                              // one id per attempt: a retry cannot create a second submission
  const [state, setState] = useState('idle'); const [err, setErr] = useState('')
  const ASPECT = 1.4
  const key = 'adult-work-draft:' + assignment.id
  const initial = useMemo(() => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }, [key])
  const send = async () => {
    setErr('')
    const strokes = simplifyStrokes(cv.current?.getStrokes())
    if (!strokes.length) { setErr(t('writeFirst')); return }
    setState('sending')
    const { error } = await learnerApi.submitWork({ assignment: assignment.id, client: client.current, kind: 'handwriting', strokes, aspect: ASPECT })
    if (error) { setState('idle'); setErr(t(errKey(error))); return }
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    setState('sent'); setTimeout(onDone, 900)
  }
  const keep = (strokes) => { try { const s = simplifyStrokes(strokes); if (s.length) localStorage.setItem(key, JSON.stringify(s)); else localStorage.removeItem(key) } catch { /* storage full: continue without a draft */ } }
  return (
    <div className="ad-card">
      <HandwritingCanvas ref={cv} aspect={ASPECT} labels={labelsFor(t)} onChange={keep} initialStrokes={initial || undefined} disabled={state !== 'idle'} />
      <p className="ad-note">{t('workDraft')}</p>
      {err && <p className="ad-error" role="alert">{err}</p>}
      {state === 'sent' && <p className="ad-ok ad-big" role="status">{t('workSentOk')}</p>}
      <div className="ad-stack">
        <button className="ad-btn primary" disabled={state !== 'idle'} onClick={send}>{state === 'sending' ? t('workSending') : t('workSend')}</button>
        <button className="ad-link" disabled={state === 'sending'} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  )
}

// ---- send: photo of the exercise book ----
function PhotoWork({ assignment, onDone, onCancel }) {
  const { t, profile, session } = useAdult()
  const client = useRef(newId())
  const [prepared, setPrepared] = useState(null)               // {blob, bytes, url}
  const [state, setState] = useState('idle'); const [err, setErr] = useState('')
  useEffect(() => () => { if (prepared?.url) URL.revokeObjectURL(prepared.url) }, [prepared])
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = ''
    if (!file) return
    setErr('')
    const bad = validatePhoto(file); if (bad) { setErr(t(errKey(bad))); return }
    setState('preparing')
    try {
      const r = await compressPhoto(file, Boolean(profile?.low_data))
      setPrepared({ blob: r.blob, bytes: r.bytes, url: URL.createObjectURL(r.blob) }); client.current = newId()      // a different photo is a different submission
    } catch (x) { const m = x instanceof Error ? x.message : ''; setErr(t(errKey(m.startsWith('PHOTO_') ? m : 'PHOTO_DECODE'))) }
    setState('idle')
  }
  const send = async () => {
    if (!prepared) return
    setErr(''); setState('sending')
    const path = photoPath(session.user.id, client.current)
    const up = await learnerApi.uploadPhoto(path, prepared.blob)
    if (up.error) { setState('idle'); setErr(t(errKey(up.error))); return }                 // the photo stays on screen: tap Send again to retry
    const { error } = await learnerApi.submitWork({ assignment: assignment.id, client: client.current, kind: 'photo', file: path, mime: 'image/jpeg', bytes: prepared.bytes })
    if (error) { setState('idle'); setErr(t(errKey(error))); return }
    setState('sent'); setTimeout(onDone, 900)
  }
  return (
    <div className="ad-card">
      {!prepared && state !== 'preparing' && (
        <div className="ad-stack">
          <label className="ad-btn primary">{t('photoTake')}<input type="file" accept="image/*" capture="environment" hidden onChange={pick} /></label>
          <label className="ad-btn">{t('photoPick')}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} /></label>
        </div>)}
      {state === 'preparing' && <p className="ad-big" role="status">{t('photoPreparing')}</p>}
      {prepared && (<>
        <p className="ad-note">{t('photoPreview')}</p>
        <img src={prepared.url} alt="" style={{ width: '100%', borderRadius: 12, border: '2px solid var(--line)' }} />
        <p className="ad-note">{t('photoSize', { kb: Math.round(prepared.bytes / 1024) })}</p>
      </>)}
      {err && <p className="ad-error" role="alert">{err}</p>}
      {state === 'sent' && <p className="ad-ok ad-big" role="status">{t('workSentOk')}</p>}
      <div className="ad-stack">
        {prepared && <button className="ad-btn primary" disabled={state !== 'idle'} onClick={send}>{state === 'sending' ? t('workSending') : t('workSend')}</button>}
        {prepared && state === 'idle' && <label className="ad-btn">{t('photoAnother')}<input type="file" accept="image/*" capture="environment" hidden onChange={pick} /></label>}
        <button className="ad-link" disabled={state === 'sending'} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  )
}
