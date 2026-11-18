import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdult } from '../AdultAuth.jsx'
import { staffApi } from '../adultApi.js'
import { simplifyStrokes } from '../imageTools.js'
import WorkViewer from '../components/WorkViewer.jsx'

// Facilitator: set assignments, see what is waiting, mark work by drawing directly over it.
// The screen only organises things; the database decides what each person may open.
const E = (t, code) => t({ network: 'errNetwork', denied: 'errDenied', CLASS_CLOSED: 'errClassClosed', BADSCORE: 'errBadScore' }[code] || 'errGeneric')
const fmt = (d) => new Date(d).toLocaleString()

export default function WorkTab() {
  const { t } = useAdult()
  const [sub, setSub] = useState('queue')
  return (
    <section>
      <div className="ad-subtabs" role="tablist">
        {[['queue', 'tQueue'], ['assignments', 'tAssignments']].map(([k, l]) => <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{t(l)}</button>)}
      </div>
      {sub === 'queue' ? <Queue /> : <Assignments />}
    </section>
  )
}

function Queue() {
  const { t } = useAdult()
  const [status, setStatus] = useState('submitted'); const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(null)
  const load = useCallback(async () => { setLoading(true); const { data, error } = await staffApi.reviewQueue(status); setLoading(false); setErr(error ? E(t, error) : ''); setRows(data || []) }, [status, t])
  useEffect(() => { load() }, [load])
  if (open) return <Review id={open} onBack={() => { setOpen(null); load() }} />
  return (
    <div>
      <div className="ad-subtabs">{[['submitted', 'statusSubmitted'], ['redo', 'statusRedo'], ['reviewed', 'statusReviewed']].map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{t(l)}</button>)}</div>
      {err && <p className="ad-error">{err}</p>}
      {loading ? <p className="ad-note">{t('wait')}</p> : rows.length === 0 ? <p className="ad-note">{t('queueEmpty')}</p> :
        <ul className="ad-list">{rows.map((r) => (
          <li key={r.id}><button onClick={() => setOpen(r.id)}>
            <strong>{r.learner_name}</strong><span>{r.assignment_title} · {t('workAttempt', { n: r.attempt_no })} · {t(r.kind === 'photo' ? 'kindPhoto' : 'kindHand')}</span>
            <span className="ad-note">{fmt(r.submitted_at)}{r.late ? ' · ' + t('lateLabel') : ''}</span>
          </button></li>))}</ul>}
    </div>
  )
}

function Review({ id, onBack }) {
  const { t } = useAdult()
  const [d, setD] = useState(null); const [url, setUrl] = useState(null); const [err, setErr] = useState(''); const [photoErr, setPhotoErr] = useState(false)
  const [score, setScore] = useState(''); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false)
  const cv = useRef(null)
  useEffect(() => {
    let off = false
    staffApi.submission(id).then(async ({ data, error }) => {
      if (off) return
      if (error) { setErr(E(t, error)); return }
      setD(data); setScore(data.feedback?.score ?? ''); setComment(data.feedback?.comment ?? '')
      if (data.submission.kind === 'photo') { const u = await staffApi.signedUrl(data.submission.file_path); if (!off) { if (u.error) setPhotoErr(true); else setUrl(u.data) } }
    })
    return () => { off = true }
  }, [id])                                                  // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (redo) => {
    setErr(''); setBusy(true)
    const prior = d.feedback?.corrections || []
    const marks = simplifyStrokes(cv.current?.getStrokes(), { keep: ['pen', 'highlight'] })        // earlier marks stay; new marks are added
    const sc = score === '' ? null : Number(score)
    const { error } = await staffApi.review({ id, score: sc, comment, corrections: [...prior, ...marks], redo })
    setBusy(false)
    if (error) setErr(E(t, error)); else { setSaved(true); setTimeout(onBack, 800) }
  }
  if (err && !d) return <><p className="ad-error">{err}</p><button className="ad-link" onClick={onBack}>{t('back')}</button></>
  if (!d) return <p className="ad-note">{t('wait')}</p>
  const s = d.submission, max = d.assignment.max_score
  const old = s.status === 'superseded'
  return (
    <div>
      <button className="ad-link" onClick={onBack}>{t('back')}</button>
      <h2>{d.learner_name}</h2>
      <p><strong>{d.assignment.title}</strong> · {t('workAttempt', { n: s.attempt_no })}</p>
      <p className="ad-note">{fmt(s.submitted_at)}</p>
      {d.assignment.instructions && <p className="ad-note" style={{ whiteSpace: 'pre-line' }}>{d.assignment.instructions}</p>}
      {photoErr && <p className="ad-error">{t('errPhotoLoad')}</p>}
      {s.kind === 'photo' && !url && !photoErr && <p className="ad-note">{t('loadingPhoto')}</p>}
      {(s.kind === 'handwriting' || url) && <WorkViewer ref={cv} submission={s} imageUrl={url} overlay={d.feedback?.corrections} annotate={!old} onImageError={() => setPhotoErr(true)}
        labels={{ pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), highlight: t('highlight'), area: t('writeHere') }} />}
      {(d.feedback?.corrections || []).length > 0 && <p className="ad-note">{t('priorMarks')}</p>}
      {!old && (
        <div className="ad-form">
          <label>{t('scoreLabel')} (0–{max})<input type="number" inputMode="decimal" min="0" max={max} step="0.5" value={score} onChange={(e) => setScore(e.target.value)} /></label>
          <label>{t('commentLabel')}<textarea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} style={{ font: 'inherit', padding: 10, borderRadius: 12, border: '2px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }} /></label>
          {err && <p className="ad-error" role="alert">{err}</p>}
          {saved && <p className="ad-ok" role="status">{t('reviewSaved')}</p>}
          <button className="ad-btn primary" disabled={busy} onClick={() => save(false)}>{t('markReviewed')}</button>
          <button className="ad-btn" disabled={busy} onClick={() => save(true)}>{t('askRedo')}</button>
        </div>)}
    </div>
  )
}

function Assignments() {
  const { t } = useAdult()
  const [classes, setClasses] = useState([]); const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [msg, setMsg] = useState('')
  const [f, setF] = useState({ cls: '', title: '', instructions: '', kind: 'either', due: '', max: 10 })
  const load = useCallback(async () => {
    const [c, a] = await Promise.all([staffApi.classes(), staffApi.assignments()])
    setClasses((c.data || []).filter((x) => x.status === 'active')); setRows(a.data || []); setErr(c.error || a.error ? E(t, c.error || a.error) : '')
  }, [t])
  useEffect(() => { load() }, [load])
  const create = async (e) => {
    e.preventDefault(); setErr(''); setMsg('')
    const { error } = await staffApi.createAssignment({ class: f.cls, title: f.title, instructions: f.instructions, kind: f.kind, due: f.due ? new Date(f.due + 'T23:59:00').toISOString() : null, max: Number(f.max) || 10 })
    if (error) setErr(E(t, error)); else { setMsg(t('saved')); setF({ ...f, title: '', instructions: '', due: '' }); load() }
  }
  const toggle = async (a) => { const { error } = await staffApi.setAssignmentStatus(a.id, a.status === 'open' ? 'closed' : 'open'); if (error) setErr(E(t, error)); else load() }
  return (
    <div>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <form className="ad-form" onSubmit={create}>
        <h2>{t('newAssignment')}</h2>
        <label>{t('class')}<select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}><option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>{t('asTitleLabel')}<input maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>{t('asInstructions')}<textarea rows={3} maxLength={2000} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} style={{ font: 'inherit', padding: 10, borderRadius: 12, border: '2px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }} /></label>
        <label>{t('asKind')}<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="either">{t('kindEither')}</option><option value="handwriting">{t('kindHand')}</option><option value="photo">{t('kindPhoto')}</option></select></label>
        <label>{t('dueDate')}<input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
        <label>{t('maxScore')}<input type="number" inputMode="numeric" min="1" max="100" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></label>
        <button className="ad-btn primary" disabled={!f.cls || !f.title.trim()}>{t('create')}</button>
      </form>
      {rows.length === 0 ? <p className="ad-note">{t('noAssignments')}</p> :
        <ul className="ad-list">{rows.map((a) => (
          <li key={a.id}><div className="ad-listrow"><strong>{a.title}</strong><span className="ad-note">{a.class_name}{a.due_at ? ' · ' + new Date(a.due_at).toLocaleDateString() : ''}</span>
            <span className="ad-tag">{t('waitingN', { n: a.waiting })}</span><span className="ad-tag">{t('markedN', { n: a.marked })}</span>{a.redo > 0 && <span className="ad-tag">{t('redoN', { n: a.redo })}</span>}
            <button className="ad-link" onClick={() => toggle(a)}>{a.status === 'open' ? t('closeAssignment') : t('reopenAssignment')}</button></div></li>))}</ul>}
    </div>
  )
}
