import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import { nameCanGuide, nameForGuide } from '../curriculum.js'
import { COURSE_DEFS, courseOfKey, lessonAny } from '../courses.js'
import { addCalc, addQuiz, buildResults, emptyResults } from '../lessonResults.js'
import { unitEvidence } from '../progress.js'
import { CalcStep, CompareStep, CountStep, NumTeach, PickNumberStep, QuizStep } from './MathSteps.jsx'
import { layoutText, scoreTrace, suggestAspect } from '../guide.js'
import { needsPractice, summarize } from '../progress.js'
import { enqueue, flush } from '../progressQueue.js'
import { hasVoice, useVoices } from '../speech.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import AdultAudio, { VoiceHint } from '../components/AdultAudio.jsx'

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now() + Math.random().toString(16).slice(2))

// Loads one course (by slug), whether the learner joined it, their progress in it, and the start advice from their latest assessment.
export function useCourse(slug) {
  const def = COURSE_DEFS[slug]
  const [d, setD] = useState({ loading: true, error: false, course: null, enrolled: false, rows: [], start: null })
  const load = useCallback(async () => {
    await flush((i) => learnerApi.recordLesson(i))                     // send anything that could not be saved earlier
    const [c, e, p, a] = await Promise.all([learnerApi.courses(), learnerApi.enrollments(), learnerApi.progress(), learnerApi.latestAssessment()])
    const course = (c.data || []).find((x) => x.slug === slug) || null
    setD({
      loading: false, error: Boolean(c.error || e.error || p.error), course, enrolled: Boolean(course && (e.data || []).some((x) => x.course_id === course.id)),
      rows: (p.data || []).filter((r) => !course || r.course_id === course.id), start: ((a.data || [])[0]?.recommended?.[def.startField]?.start) || null,
    })
  }, [slug, def.startField])
  useEffect(() => { load() }, [load])
  return { ...d, reload: load }
}
export const useLiteracy = () => useCourse('basic-literacy')

const lessonTitle = (t, l) => t(l.title.key, l.title.vars)

export const LessonList = () => <CourseList slug="basic-literacy" />
export const NumeracyList = () => <CourseList slug="basic-numeracy" />

function CourseList({ slug }) {
  const { t } = useAdult()
  const def = COURSE_DEFS[slug]
  const d = useCourse(slug)
  const [err, setErr] = useState('')
  const [skills, setSkills] = useState([])
  const KEYS = useMemo(() => def.lessons.map((l) => l.key), [def])
  const sum = useMemo(() => summarize(d.rows, KEYS), [d.rows, KEYS])
  useEffect(() => { if (def.numeracy) learnerApi.skills().then((r) => setSkills(r.data || [])) }, [def.numeracy])
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  const join = async () => { setErr(''); const { error } = await learnerApi.enroll(d.course.id); if (error) setErr(t(error === 'network' ? 'errNetwork' : 'errGeneric')); else d.reload() }
  if (!d.course) return <main className="ad-page"><p className="ad-big">{t('errGeneric')}</p></main>
  if (!d.enrolled) return (
    <main className="ad-page"><h1>{t('lessonsTitle')}</h1><p className="ad-big">{t('notEnrolled')}</p>
      {err && <p className="ad-error">{err}</p>}<button className="ad-btn primary" onClick={join}>{t('joinFree')}</button></main>)
  const startKey = sum.completed === 0 ? def.first(d.start).key : sum.next
  return (
    <main className="ad-page">
      <h1>{t('lessonsTitle')}</h1>
      <VoiceHint />
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      <div className="ad-card">
        <p className="ad-big">{t('progressLine', { done: sum.completed, total: sum.total })}</p>
        <div className="ad-progress" aria-hidden="true"><i style={{ width: (sum.completed / sum.total) * 100 + '%' }} /></div>
        {sum.practice.length > 0 && <p className="ad-note">{t('practiceCount', { n: sum.practice.length })}</p>}
        {startKey && <Link className="ad-btn primary" to={'/adult/learn/' + startKey}>{sum.completed === 0 ? t('startHere') : t('continueLesson')}</Link>}
      </div>
      {def.units.map((u) => {
        const ue = def.numeracy ? unitEvidence(u, sum.byKey) : null
        const confirmed = def.numeracy && skills.find((x) => x.skill === u.id && x.result === 'can')
        return (
        <section key={u.id}>
          <h2>{t(u.titleKey)}</h2>
          {ue && <p className="ad-note">{t('unitProgress', { done: ue.done, total: ue.total })}{confirmed ? ' · ' + t('confirmedTag') : ''}</p>}
          <ul className="ad-lessons">
            {u.lessons.map((l) => {
              const r = sum.byKey[l.key]; const done = r?.status === 'completed'
              return (
                <li key={l.key}>
                  <Link to={'/adult/learn/' + l.key} className={'ad-lesson' + (done ? ' done' : '') + (l.key === startKey ? ' next' : '')}>
                    <span className="ad-mark" aria-hidden="true">{done ? '✓' : r ? '•' : ''}</span>
                    <span>{lessonTitle(t, l)}</span>
                    {done && needsPractice(r) && <span className="ad-tag">{t('practiceAgain')}</span>}
                  </Link>
                </li>)
            })}
          </ul>
        </section>)})}
    </main>
  )
}

// ---------------- steps ----------------
function Feedback({ ok, children }) { return <p className={ok ? 'ad-ok ad-big' : 'ad-note ad-big'} role="status">{children}</p> }
const Pre = ({ children, className = 'ad-huge' }) => <p className={className} style={{ whiteSpace: 'pre-line' }}>{children}</p>

function TeachStep({ step, name, onNext }) {
  const { t, lang } = useAdult()
  const gloss = lang === 'en' && step.gloss ? <p className="ad-note">{step.gloss}</p> : null     // meanings are only written in English
  let body
  if (step.kind === 'letter') body = (<>
    <p className="ad-giant" aria-label={step.letter}>{step.letter} <span>{step.lower}</span></p>
    <p className="ad-big">{t('teachLetter', { upper: step.letter, lower: step.lower, word: step.word })}</p>
    <p className="ad-huge">{step.word}</p>{gloss}
    <AdultAudio text={t('teachLetter', { upper: step.letter, lower: step.lower, word: step.word })} big />
    <AdultAudio text={step.word} lang="ha" big />
  </>)
  else if (step.kind === 'word') body = (<>
    <p className="ad-big">{t('teachWord', { word: step.word })}</p><p className="ad-giant small">{step.word}</p>{gloss}
    <AdultAudio text={step.word} lang="ha" big /></>)
  else if (step.kind === 'name') body = (<><p className="ad-big">{t('teachName')}</p><p className="ad-giant small">{name}</p></>)
  else body = (<>
    <p className="ad-big">{t(step.kind === 'message' ? 'teachMessage' : 'teachSentence')}</p><p className="ad-giant small">{step.sentence}</p>{gloss}
    <AdultAudio text={step.sentence} lang="ha" big /></>)
  return <>{body}<button className="ad-btn primary" onClick={onNext}>{t('next')}</button></>
}

function ShowStep({ text, onNext }) {
  const { t } = useAdult()
  const aspect = useMemo(() => suggestAspect(text), [text])
  const guide = useMemo(() => layoutText(text, aspect), [text, aspect])
  const [n, setN] = useState(0)
  return (<>
    <p className="ad-big">{t('showText')}</p>
    <HandwritingCanvas aspect={aspect} tools={false} disabled guideStrokes={guide?.strokes} guideMode="demo" replayKey={n} />
    <div className="ad-row"><button className="ad-btn" onClick={() => setN(n + 1)}>{t('replay')}</button><button className="ad-btn primary" onClick={onNext}>{t('next')}</button></div>
  </>)
}

function TraceStep({ text, onResult, onNext }) {
  const { t } = useAdult()
  const aspect = useMemo(() => suggestAspect(text), [text])
  const guide = useMemo(() => layoutText(text, aspect), [text, aspect])
  const cv = useRef(null); const best = useRef(0)
  const [fb, setFb] = useState(null); const [tries, setTries] = useState(0)
  const labels = { pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') }
  const check = () => {
    if (!cv.current || cv.current.isEmpty()) { setFb({ empty: true }); return }
    const r = scoreTrace(guide, cv.current.getStrokes(), aspect)
    best.current = Math.max(best.current, r.score); const n = tries + 1
    setTries(n); setFb(r); onResult({ trace: best.current, traceTries: n })
  }
  const again = () => { cv.current?.reset(); setFb(null) }
  const canGo = fb && !fb.empty && (fb.ok || tries >= 2)
  return (<>
    <p className="ad-big">{t('traceText')}</p>
    <HandwritingCanvas ref={cv} aspect={aspect} guideStrokes={guide?.strokes} labels={labels} onChange={() => setFb((f) => (f ? null : f))} />
    {fb && (fb.empty ? <Feedback>{t('traceEmpty')}</Feedback> : fb.ok ? <Feedback ok>{t('traceGood')}</Feedback> : <Feedback>{t('traceRetry')}</Feedback>)}
    <div className="ad-stack">
      {!fb && <button className="ad-btn primary" onClick={check}>{t('check')}</button>}
      {fb && !fb.ok && <button className="ad-btn primary" onClick={again}>{t('clearTry')}</button>}
      {canGo && <button className={'ad-btn' + (fb.ok ? ' primary' : '')} onClick={onNext}>{fb.ok ? t('next') : t('continueAnyway')}</button>}
    </div>
  </>)
}

function WriteStep({ text, onResult, onNext }) {
  const { t } = useAdult()
  const aspect = useMemo(() => suggestAspect(text), [text])
  const [shown, setShown] = useState(false); const [rated, setRated] = useState(false)
  const labels = { pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') }
  const rate = (r) => { onResult({ write: r }); setRated(true); onNext() }
  return (<>
    <p className="ad-big">{t('writeAlone')}</p>
    <Pre className="ad-big">{text}</Pre>
    <HandwritingCanvas aspect={aspect} labels={labels} disabled={shown} />
    {!shown
      ? <button className="ad-btn primary" onClick={() => setShown(true)}>{t('doneWriting')}</button>
      : <><p className="ad-note">{t('theAnswerIs')}</p><Pre>{text}</Pre><p className="ad-big">{t('didItMatch')}</p>
          <div className="ad-stack" aria-disabled={rated}>
            <button className="ad-btn primary" disabled={rated} onClick={() => rate('yes')}>{t('canDo')}</button>
            <button className="ad-btn" disabled={rated} onClick={() => rate('help')}>{t('canHelp')}</button>
            <button className="ad-btn" disabled={rated} onClick={() => rate('no')}>{t('cannot')}</button>
          </div></>}
  </>)
}

// Multiple choice. The first tap is the answer; it is shown, then the learner moves on.
function ChoiceStep({ kind, prompt, big, options, target, answerLabel, extra, onResult, onNext, field }) {
  const { t } = useAdult()
  const [picked, setPicked] = useState(null)
  const pick = (o) => { if (picked !== null) return; setPicked(o); onResult({ [field]: o === target ? 'yes' : 'no' }) }
  return (<>
    <p className="ad-big">{prompt}</p>
    {extra}
    {big}
    <div className="ad-grid" data-kind={kind}>
      {options.map((o) => <button key={o} className={'ad-btn ad-opt' + (picked !== null && o === target ? ' right' : picked === o ? ' wrong' : '')} disabled={picked !== null && picked !== o && o !== target} onClick={() => pick(o)}>{o}</button>)}
    </div>
    {picked !== null && (picked === target ? <Feedback ok>{t('rightAnswer')}</Feedback> : <Feedback>{t('wrongAnswer', { answer: answerLabel || target })}</Feedback>)}
    {picked !== null && <button className="ad-btn primary" onClick={onNext}>{t('next')}</button>}
  </>)
}

function ReviewStep({ results, saveState, next, onList, numeracy }) {
  const { t } = useAdult()
  const nav = useNavigate()
  const traced = results.trace != null
  return (<>
    <h2>{t('reviewTitle')}</h2>
    <div className="ad-card">
      {traced && <p className="ad-big">{results.trace >= 0.68 ? t('reviewTraceGood') : t('reviewTraceMore')}</p>}
      {results.write && <p className="ad-big">{t('reviewWrite_' + results.write)}</p>}
      {(results.match || results.find) && <p className="ad-big">{[results.match, results.find].filter(Boolean).every((x) => x === 'yes') ? t('reviewChoicesOk') : t('reviewChoicesMore')}</p>}
      {numeracy && results.calcN > 0 && <p className="ad-big">{t('reviewCalc', { n: results.calcN, yes: results.calcYes })}</p>}
      {numeracy && results.quizN > 0 && <p className="ad-big">{t('reviewQuiz', { n: results.quizN, right: results.quizRight })}</p>}
      {numeracy && results.calcN > 0 && <p className="ad-note">{t('reviewSelfNote')}</p>}
      {saveState === 'saving' && <p className="ad-note">{t('saving')}</p>}
      {saveState === 'queued' && <p className="ad-banner">{t('savedLocal')}</p>}
      {saveState === 'denied' && <p className="ad-error">{t('notEnrolled')}</p>}
    </div>
    <p className="ad-note">{t('writingNotSent')}</p>
    <div className="ad-stack">
      {next && <button className="ad-btn primary" onClick={() => nav('/adult/learn/' + next.key)}>{t('nextLesson')}</button>}
      <button className="ad-btn" onClick={onList}>{t('toList')}</button>
    </div>
  </>)
}

export function LessonPlayer() {
  const { key } = useParams()
  const lesson = lessonAny(key)
  const def = courseOfKey(key) || COURSE_DEFS['basic-literacy']
  const nav = useNavigate()
  const { t, profile } = useAdult()
  useVoices()
  const d = useCourse(def.slug)
  const name = nameForGuide(profile?.full_name)
  const steps = useMemo(() => {
    if (!lesson) return []
    return lesson.steps
      .filter((s) => !(s.type === 'trace' && s.text === '@NAME' && !nameCanGuide(name)))     // no guide for letters outside the Hausa alphabet
      .map((s) => (s.text === '@NAME' ? { ...s, text: name } : s))
  }, [lesson, name])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState(emptyResults)
  const [client] = useState(newId)
  const [saveState, setSaveState] = useState('idle')
  const saved = useRef(false)
  const merge = (patch) => setResults((r) => ({ ...r, ...patch }))
  const onQuiz = (ok) => setResults((r) => addQuiz(r, ok))
  const onCalc = (rating) => setResults((r) => addCalc(r, rating))
  const step = steps[idx]

  useEffect(() => {                                       // reaching the review step saves the run, exactly once
    if (!step || step.type !== 'review' || saved.current || !d.course || d.loading) return
    saved.current = true; setSaveState('saving')
    const payload = { course: d.course.id, lesson: lesson.key, client, status: 'completed', results: buildResults(results, steps.length - 1, def.numeracy) }
    learnerApi.recordLesson(payload).then(({ error }) => {
      if (!error) setSaveState('saved')
      else if (error === 'denied') setSaveState('denied')
      else { enqueue(payload); setSaveState('queued') }
    })
  }, [step, d.course, d.loading])                         // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) return <Navigate to="/adult/learn" replace />
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (!d.enrolled) return <main className="ad-page"><p className="ad-big">{t('notEnrolled')}</p><Link className="ad-btn primary" to={def.listPath}>{t('toList')}</Link></main>
  const go = () => setIdx((i) => Math.min(i + 1, steps.length - 1))
  const nextL = def.next(lesson.key)
  const voice = hasVoice('ha')
  const body = (() => {
    switch (step.type) {
      case 'teach': return def.numeracy ? <NumTeach step={step} onNext={go} /> : <TeachStep step={step} name={name} onNext={go} />
      case 'pickNumber': return <PickNumberStep step={step} onAnswer={onQuiz} onNext={go} />
      case 'count': return <CountStep step={step} onAnswer={onQuiz} onNext={go} />
      case 'compare': return <CompareStep step={step} onAnswer={onQuiz} onNext={go} />
      case 'quiz': return <QuizStep step={step} onAnswer={onQuiz} onNext={go} />
      case 'calc': return <CalcStep step={step} onRate={onCalc} onNext={go} />
      case 'show': return <ShowStep text={step.text} onNext={go} />
      case 'trace': return <TraceStep text={step.text} onResult={merge} onNext={go} />
      case 'write': return <WriteStep text={step.text} onResult={merge} onNext={go} />
      case 'match': return <ChoiceStep kind="letter" field="match" prompt={t('matchPrompt')} big={<p className="ad-giant">{step.prompt}</p>} options={step.options} target={step.target} onResult={merge} onNext={go} />
      case 'find': {
        const hear = voice && (step.kind === 'sameWord' || step.kind === 'sameSentence')   // with a Hausa voice this becomes a real reading task
        if (step.kind === 'hasLetter') return <ChoiceStep kind="word" field="find" prompt={t('findHasLetter', { upper: step.letter })} big={<p className="ad-giant small">{step.letter}</p>} options={step.options} target={step.target} onResult={merge} onNext={go} />
        return <ChoiceStep kind="word" field="find" prompt={t(hear ? 'findHear' : 'findSame')} big={hear ? null : <p className="ad-giant small">{step.target}</p>} extra={hear ? <AdultAudio text={step.target} lang="ha" big /> : null} options={step.options} target={step.target} onResult={merge} onNext={go} />
      }
      default: return <ReviewStep results={results} saveState={saveState} next={nextL} onList={() => nav(def.listPath)} numeracy={def.numeracy} />
    }
  })()
  return (
    <main className="ad-page" key={lesson.key + ':' + idx}>
      <div className="ad-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={idx}><i style={{ width: (idx / (steps.length - 1)) * 100 + '%' }} /></div>
      <p className="ad-note">{lessonTitle(t, lesson)}</p>
      {body}
      {idx > 0 && step.type !== 'review' && <button className="ad-link" onClick={() => setIdx(idx - 1)}>{t('back')}</button>}
      {step.type !== 'review' && <Link className="ad-link" to={def.listPath}>{t('toList')}</Link>}
    </main>
  )
}
