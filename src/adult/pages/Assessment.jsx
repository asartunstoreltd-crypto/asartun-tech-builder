import { useMemo, useRef, useState } from 'react'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi, staffApi } from '../adultApi.js'
import { DOMAINS, ITEMS, recommend, scoreAnswers } from '../assessment.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import AdultAudio, { hasAdultAudio } from '../components/AdultAudio.jsx'

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now() + Math.random().toString(16).slice(2))
const draftKey = (who) => 'adult-assess-draft:' + who
const loadDraft = (who) => { try { return JSON.parse(localStorage.getItem(draftKey(who))) } catch { return null } }
const saveDraft = (who, d) => { try { localStorage.setItem(draftKey(who), JSON.stringify(d)) } catch { /* storage full or blocked: continue without a draft */ } }
const clearDraft = (who) => { try { localStorage.removeItem(draftKey(who)) } catch { /* ignore */ } }

export function AssessmentResult({ recommended, scores, needsConfirmation }) {
  const { t } = useAdult()
  const r = recommended || {}
  const line = (label, o) => o && o.start ? t(label, { start: t('start_' + o.start) }) : t('levelUnknown', { what: t(label + 'Name') })
  return (
    <div className="ad-card">
      <p className="ad-big">{line('resLiteracy', r.literacy)}</p>
      <p className="ad-big">{line('resNumeracy', r.numeracy)}</p>
      <p className="ad-big">{r.digital?.ready === null || r.digital === undefined ? t('digitalUnknown') : r.digital.ready ? t('digitalReady') : t('digitalLater')}</p>
      {!r.complete && <p className="ad-note">{t('notAssessedNote')}</p>}
      {needsConfirmation && <p className="ad-note">{t('needsConfirm')}</p>}
      {scores && <ul className="ad-levels">{DOMAINS.map((d) => <li key={d}><span>{t('dom_' + d)}</span><span className="ad-dots" aria-label={scores[d] === null || scores[d] === undefined ? t('notAssessed') : `${scores[d]}/3`}>
        {scores[d] === null || scores[d] === undefined ? '—' : [0, 1, 2].map((i) => <i key={i} className={i < scores[d] ? 'on' : ''} />)}</span></li>)}</ul>}
    </div>
  )
}

// mode 'self': the learner, alone.  mode 'assisted': a facilitator with the learner (learnerId required).
export default function Assessment({ mode = 'self', learnerId = null, learnerName = '', onDone }) {
  const { t, lang, session, profile } = useAdult()
  const who = learnerId || session?.user?.id || 'anon'
  const name = learnerName || profile?.full_name || ''
  const assisted = mode === 'assisted'
  const items = useMemo(() => ITEMS.map((i) => (i.id === 'w2_name' ? { ...i, answer: name } : i)), [name])
  const steps = useMemo(() => items.filter((i) => assisted || !i.staffOnly), [items, assisted])
  const initial = useMemo(() => loadDraft(who), [who])
  const [client] = useState(() => initial?.client || newId())
  const [answers, setAnswers] = useState(() => initial?.answers || {})
  const [idx, setIdx] = useState(() => Math.min(initial?.idx || 0, steps.length))
  const [started, setStarted] = useState(Boolean(initial && (initial.idx || 0) > 0))
  const [revealed, setRevealed] = useState(false)
  const [state, setState] = useState('answering')        // answering | saving | failed | saved
  const [result, setResult] = useState(null)
  const canvas = useRef(null)

  const noAudio = !assisted && !steps.some((s) => s.needsAudio && hasAdultAudio(lang, s.id))
  const labels = { pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') }

  const finish = async (final) => {
    setState('saving')
    const list = items.map((i) => final[i.id] || { id: i.id, result: 'skipped', source: assisted ? 'staff' : 'self' })
    const scores = scoreAnswers(list); const recommended = recommend(scores)
    const payload = { client, items: list, scores, recommended }
    const { error } = assisted ? await staffApi.submitAssessment(learnerId, payload) : await learnerApi.submitAssessment(payload)
    if (error) { setResult(payload); setState('failed'); return }
    clearDraft(who); setResult(payload); setState('saved'); onDone?.(payload)
  }
  const answer = (item, res, source) => {
    const next = { ...answers, [item.id]: { id: item.id, result: res, source } }
    setAnswers(next); setRevealed(false)
    const n = idx + 1
    setIdx(n); saveDraft(who, { client, answers: next, idx: n })
    if (n >= steps.length) finish(next)
  }
  const back = () => { if (idx > 0) { setIdx(idx - 1); setRevealed(false) } }

  if (!started) return (
    <div className="ad-page">
      <h1>{t('asTitle')}</h1>
      <p className="ad-big">{t(assisted ? 'asIntroStaff' : 'asIntro')}</p>
      {noAudio && <p className="ad-banner">{t('asNoAudio')}</p>}
      <button className="ad-btn primary" onClick={() => setStarted(true)}>{t('asStart')}</button>
    </div>
  )
  if (state === 'saving') return <div className="ad-page ad-center"><p className="ad-big">{t('saving')}</p></div>
  if (state === 'failed') return (
    <div className="ad-page ad-center">
      <p className="ad-error" role="alert">{t('saveFailed')}</p>
      <button className="ad-btn primary" onClick={() => finish(answers)}>{t('tryAgain')}</button>
    </div>
  )
  if (state === 'saved' && result) return (
    <div className="ad-page">
      <h1>{t('resultTitle')}</h1>
      <AssessmentResult recommended={result.recommended} scores={result.scores} needsConfirmation={!assisted} />
    </div>
  )

  const item = steps[idx]
  if (!item) return null
  const src = assisted ? 'staff' : 'self'
  const rate = (
    <div className="ad-stack">
      <button className="ad-btn primary" onClick={() => answer(item, 'yes', src)}>{t('canDo')}</button>
      <button className="ad-btn" onClick={() => answer(item, 'help', src)}>{t('canHelp')}</button>
      <button className="ad-btn" onClick={() => answer(item, 'no', src)}>{t('cannot')}</button>
    </div>
  )
  return (
    <div className="ad-page" key={item.id}>
      <div className="ad-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={idx}><i style={{ width: (idx / steps.length) * 100 + '%' }} /></div>
      <p className="ad-note">{t('asStep', { n: idx + 1, total: steps.length })}</p>
      <p className="ad-big">{t('ip_' + item.id)}</p>
      <AdultAudio id={item.id} big />
      {item.question && <p className="ad-huge">{item.question}</p>}
      {item.dots && <div className="ad-dotsrow" aria-label={t('ip_n2_count')}>{Array.from({ length: item.dots }, (_, i) => <i key={i} />)}</div>}
      {item.kind === 'choice' && (
        <div className="ad-grid">
          {item.options.map((o) => <button key={o} className="ad-btn ad-huge" onClick={() => answer(item, o === item.target ? 'yes' : 'no', 'auto')}>{o}</button>)}
          <button className="ad-btn wide" onClick={() => answer(item, 'no', 'auto')}>{t('dontKnow')}</button>
        </div>
      )}
      {item.kind === 'write_check' && (
        <>
          <HandwritingCanvas ref={canvas} height={item.id === 'w3_word' || item.id === 'w2_name' ? 200 : 240} labels={labels} />
          {!revealed
            ? <button className="ad-btn primary" onClick={() => setRevealed(true)}>{t('doneWriting')}</button>
            : <>
                <p className="ad-note">{t('theAnswerIs')}</p>
                <p className="ad-huge">{item.answer || '—'}</p>
                <p className="ad-big">{t('didItMatch')}</p>{rate}
              </>}
        </>
      )}
      {item.kind === 'rated' && (<>{item.display && <p className="ad-huge">{item.display}</p>}{rate}</>)}
      {idx > 0 && <button className="ad-link" onClick={back}>{t('back')}</button>}
    </div>
  )
}
