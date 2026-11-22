import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'
import { COURSES, courseOfLesson, firstLessonOf, lessonByKey, nextInCourse } from '../courses.js'
import { nameCanGuide, nameForGuide } from '../curriculum.js'
import { formatItem } from '../numeracy.js'
import { layoutText, scoreTrace, suggestAspect } from '../guide.js'
import { aggregateResults, needsPractice, summarize } from '../progress.js'
import { enqueue, flush } from '../progressQueue.js'
import { hasVoice, useVoices } from '../speech.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import AdultAudio, { VoiceHint } from '../components/AdultAudio.jsx'
import { TapStep } from '../components/DigitalSteps.jsx'
import PayPanel from './Pay.jsx'
import { CertificateBox } from './Certificate.jsx'

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now() + Math.random().toString(16).slice(2))
const LITERACY = 'basic-literacy'

// Loads one course, whether the learner joined it, their progress, and the starting point advised by the assessment.
export function useCourse(slug) {
  const { contentReady, profile } = useAdult()                         // dashboard courses are registered once the admin's content has loaded
  const [d, setD] = useState({ loading: true, error: false, course: null, enrolled: false, expired: false, endsAt: null, rows: [], start: null })
  const kind = COURSES[slug]?.kind
  const load = useCallback(async () => {
    await flush((i) => learnerApi.recordLesson(i), profile?.id)                   // send anything that could not be saved earlier
    const [c, e, p, a] = await Promise.all([learnerApi.courses(), learnerApi.enrollments(), learnerApi.progress(), learnerApi.latestAssessment()])
    const course = (c.data || []).find((x) => x.slug === slug) || null
    const keys = new Set((COURSES[slug] ? COURSES[slug].lessons : []).map((l) => l.key))
    const mine = course ? (e.data || []).find((x) => x.course_id === course.id) : null
    const active = Boolean(mine && (!mine.ends_at || Date.parse(mine.ends_at) > Date.now()))     // the database enforces the same rule
    setD({
      loading: false, error: Boolean(c.error || e.error || p.error), course, enrolled: active, expired: Boolean(mine && !active), endsAt: mine ? mine.ends_at : null,
      rows: (p.data || []).filter((r) => keys.has(r.lesson_key)), start: ((a.data || [])[0]?.recommended?.[kind]?.start) || null,
    })
  }, [slug, kind, contentReady, profile?.id])                                         // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])
  return { ...d, reload: load }
}
export const useLiteracy = () => useCourse(LITERACY)
const lessonTitle = (t, l) => t(l.title.key, l.title.vars)

export function LessonList({ slug = LITERACY }) {
  const { t, lang, contentReady } = useAdult()
  const def = COURSES[slug]
  const d = useCourse(slug)
  const [err, setErr] = useState('')
  const keys = useMemo(() => (def ? def.lessons.map((l) => l.key) : []), [def])
  const sum = useMemo(() => summarize(d.rows, keys), [d.rows, keys])
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  const join = async () => { setErr(''); const { error } = await learnerApi.enroll(d.course.id); if (error) setErr(t(error === 'network' ? 'errNetwork' : 'errGeneric')); else d.reload() }
  if (!d.course) return <main className="ad-page"><p className="ad-big">{t('errGeneric')}</p></main>
  const title = def ? t(def.titleKey) : (d.course.title[lang] || d.course.title.en)
  if (!d.enrolled && !d.course.is_free) return <main className="ad-page"><h1>{title}</h1><PayPanel course={d.course} expired={d.expired} endsAt={d.endsAt} onDone={d.reload} /></main>
  if (!d.enrolled) return (
    <main className="ad-page"><h1>{title}</h1><p className="ad-big">{t('notEnrolled')}</p>
      {err && <p className="ad-error">{err}</p>}<button className="ad-btn primary" onClick={join}>{t('joinFree')}</button></main>)
  if (!def) return <main className="ad-page"><h1>{title}</h1><p className="ad-big">{contentReady ? t('courseNoLessons') : t('wait')}</p></main>
  const startKey = sum.completed === 0 ? firstLessonOf(def, d.start).key : sum.next
  return (
    <main className="ad-page">
      <h1>{t(def.titleKey)}</h1>
      <VoiceHint />
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      <div className="ad-card">
        <p className="ad-big">{t('progressLine', { done: sum.completed, total: sum.total })}</p>
        <div className="ad-progress" aria-hidden="true"><i style={{ width: (sum.completed / sum.total) * 100 + '%' }} /></div>
        {sum.practice.length > 0 && <p className="ad-note">{t('practiceCount', { n: sum.practice.length })}</p>}
        {startKey && <Link className="ad-btn primary" to={'/adult/learn/' + startKey}>{sum.completed === 0 ? t('startHere') : t('continueLesson')}</Link>}
      </div>
      {def.units.map((u) => (
        <section key={u.id}>
          <h2>{t(u.titleKey)}</h2>
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
        </section>))}
      <CertificateBox course={d.course} />
    </main>
  )
}

// ---------------- steps ----------------
function Feedback({ ok, children }) { return <p className={ok ? 'ad-ok ad-big' : 'ad-note ad-big'} role="status">{children}</p> }
const Pre = ({ children, className = 'ad-huge' }) => <p className={className} style={{ whiteSpace: 'pre-line' }}>{children}</p>
const Dots = ({ n }) => (n > 0 ? <div className="ad-dotsrow" role="img" aria-label={String(n)}>{Array.from({ length: n }, (_, i) => <i key={i} />)}</div> : null)
const labelsFor = (t) => ({ pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') })
const questionText = (t, f) => (f.textKey ? t(f.textKey, f.vars) : f.expr)

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
  else if (step.kind === 'digit') body = (<>
    <p className="ad-giant">{step.n}</p><p className="ad-huge">{step.word}</p><Dots n={step.n} />
    <p className="ad-big">{t('teachDigit', { n: step.n, word: step.word })}</p>
    <AdultAudio text={step.word} lang="ha" big /></>)
  else if (step.kind === 'concept') {
    const w = step.worked ? formatItem(step.worked) : null
    body = (<>
      <p className="ad-big">{t(step.conceptKey)}</p>
      <AdultAudio text={t(step.conceptKey)} audioKey={step.conceptKey} big />
      {w && <><p className="ad-note">{t('workedExample')}</p>{w.textKey && <p className="ad-big">{t(w.textKey, w.vars)}</p>}<Pre>{w.full}</Pre></>}
    </>)
  }
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

function TraceStep({ text, onAnswer, onNext }) {
  const { t } = useAdult()
  const aspect = useMemo(() => suggestAspect(text), [text])
  const guide = useMemo(() => layoutText(text, aspect), [text, aspect])
  const cv = useRef(null); const best = useRef(0)
  const [fb, setFb] = useState(null); const [tries, setTries] = useState(0)
  const check = () => {
    if (!cv.current || cv.current.isEmpty()) { setFb({ empty: true }); return }
    const r = scoreTrace(guide, cv.current.getStrokes(), aspect)
    best.current = Math.max(best.current, r.score); const n = tries + 1
    setTries(n); setFb(r); onAnswer({ type: 'trace', score: best.current, tries: n })
  }
  const again = () => { cv.current?.reset(); setFb(null) }
  const canGo = fb && !fb.empty && (fb.ok || tries >= 2)
  return (<>
    <p className="ad-big">{t('traceText')}</p>
    <HandwritingCanvas ref={cv} aspect={aspect} guideStrokes={guide?.strokes} labels={labelsFor(t)} onChange={() => setFb((f) => (f ? null : f))} />
    {fb && (fb.empty ? <Feedback>{t('traceEmpty')}</Feedback> : fb.ok ? <Feedback ok>{t('traceGood')}</Feedback> : <Feedback>{t('traceRetry')}</Feedback>)}
    <div className="ad-stack">
      {!fb && <button className="ad-btn primary" onClick={check}>{t('check')}</button>}
      {fb && !fb.ok && <button className="ad-btn primary" onClick={again}>{t('clearTry')}</button>}
      {canGo && <button className={'ad-btn' + (fb.ok ? ' primary' : '')} onClick={onNext}>{fb.ok ? t('next') : t('continueAnyway')}</button>}
    </div>
  </>)
}

function WriteStep({ text, onAnswer, onNext }) {
  const { t } = useAdult()
  const aspect = useMemo(() => suggestAspect(text), [text])
  const [shown, setShown] = useState(false)
  const rate = (r) => { onAnswer({ type: 'write', rating: r }); onNext() }
  return (<>
    <p className="ad-big">{t('writeAlone')}</p>
    <Pre className="ad-big">{text}</Pre>
    <HandwritingCanvas aspect={aspect} labels={labelsFor(t)} disabled={shown} />
    {!shown
      ? <button className="ad-btn primary" onClick={() => setShown(true)}>{t('doneWriting')}</button>
      : <><p className="ad-note">{t('theAnswerIs')}</p><Pre>{text}</Pre><p className="ad-big">{t('didItMatch')}</p>
          <div className="ad-stack">
            <button className="ad-btn primary" onClick={() => rate('yes')}>{t('canDo')}</button>
            <button className="ad-btn" onClick={() => rate('help')}>{t('canHelp')}</button>
            <button className="ad-btn" onClick={() => rate('no')}>{t('cannot')}</button>
          </div></>}
  </>)
}

// Handwritten maths: the learner WRITES the answer with a finger. The app does not read handwriting: it then shows the
// correct answer and the learner (or the facilitator sitting with them) says whether the answer was the same.
function CalcStep({ item, onAnswer, onNext }) {
  const { t } = useAdult()
  const f = useMemo(() => formatItem(item), [item])
  const [shown, setShown] = useState(false)
  const rate = (r) => { onAnswer({ type: 'calc', rating: r }); onNext() }
  return (<>
    <p className="ad-big">{t('calcPrompt')}</p>
    {f.textKey ? <><p className="ad-big">{t(f.textKey, f.vars)}</p><p className="ad-note">{f.expr}</p></> : <Pre>{f.expr}</Pre>}
    <HandwritingCanvas aspect={2.2} labels={labelsFor(t)} disabled={shown} />
    {!shown
      ? <button className="ad-btn primary" onClick={() => setShown(true)}>{t('doneWriting')}</button>
      : <><p className="ad-note">{t('correctAnswerIs')}</p><Pre>{f.full}</Pre><p className="ad-big">{t('mathSameQ')}</p>
          <div className="ad-stack">
            <button className="ad-btn primary" onClick={() => rate('yes')}>{t('mathSame')}</button>
            <button className="ad-btn" onClick={() => rate('help')}>{t('mathUnsure')}</button>
            <button className="ad-btn" onClick={() => rate('no')}>{t('mathDiff')}</button>
          </div></>}
  </>)
}

// Multiple choice, marked automatically. The first tap is the answer; it is shown, then the learner moves on.
function ChoiceStep({ kind, prompt, big, options, target, answerLabel, extra, why, onAnswer, onNext }) {
  const { t } = useAdult()
  const [picked, setPicked] = useState(null)
  const pick = (o) => { if (picked !== null) return; setPicked(o); onAnswer({ type: kind, ok: o === target }) }
  return (<>
    <p className="ad-big">{prompt}</p>
    {extra}
    {big}
    <div className="ad-grid" data-kind={kind}>
      {options.map((o) => <button key={o} className={'ad-btn ad-opt' + (picked !== null && o === target ? ' right' : picked === o ? ' wrong' : '')} disabled={picked !== null && picked !== o && o !== target} onClick={() => pick(o)}>{o}</button>)}
    </div>
    {picked !== null && (picked === target ? <Feedback ok>{t('rightAnswer')}</Feedback> : <Feedback>{t('wrongAnswer', { answer: answerLabel || target })}</Feedback>)}
    {picked !== null && why && <p className="ad-note"><strong>{t('dlWhy')}</strong> {why}</p>}
    {picked !== null && <button className="ad-btn primary" onClick={onNext}>{t('next')}</button>}
  </>)
}

function ReviewStep({ results, saveState, next, onList }) {
  const { t } = useAdult()
  const nav = useNavigate()
  const written = results.calcYes + results.calcHelp + results.calcNo
  return (<>
    <h2>{t('reviewTitle')}</h2>
    <div className="ad-card">
      {results.trace != null && <p className="ad-big">{results.trace >= 0.68 ? t('reviewTraceGood') : t('reviewTraceMore')}</p>}
      {results.write && <p className="ad-big">{t('reviewWrite_' + results.write)}</p>}
      {written > 0 && <p className="ad-big">{t('reviewCalc', { same: results.calcYes, total: written })}</p>}
      {results.pickTotal > 0 && <p className="ad-big">{t('reviewPick', { right: results.pickRight, total: results.pickTotal })}</p>}
      {(results.match || results.find) && <p className="ad-big">{[results.match, results.find].filter(Boolean).every((x) => x === 'yes') ? t('reviewChoicesOk') : t('reviewChoicesMore')}</p>}
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
  const lesson = lessonByKey(key)
  const course = lesson ? courseOfLesson(lesson.key) : null
  const nav = useNavigate()
  const { t, profile, contentReady } = useAdult()
  useVoices()
  const d = useCourse(course ? course.slug : LITERACY)
  const name = nameForGuide(profile?.full_name)
  const steps = useMemo(() => {
    if (!lesson) return []
    return lesson.steps
      .filter((s) => !(s.type === 'trace' && s.text === '@NAME' && !nameCanGuide(name)))     // no guide for letters outside the Hausa alphabet
      .map((s) => (s.text === '@NAME' ? { ...s, text: name } : s))
  }, [lesson, name])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [client] = useState(newId)
  const [saveState, setSaveState] = useState('idle')
  const saved = useRef(false)
  const step = steps[idx]
  const results = useMemo(() => aggregateResults(steps, answers), [steps, answers])
  const answer = (v) => setAnswers((a) => ({ ...a, [idx]: v }))

  useEffect(() => {                                       // reaching the review step saves the run, exactly once
    if (!step || step.type !== 'review' || saved.current || !d.course || d.loading) return
    saved.current = true; setSaveState('saving')
    const payload = { course: d.course.id, lesson: lesson.key, client, status: 'completed', results }
    learnerApi.recordLesson(payload).then(({ error }) => {
      if (!error) setSaveState('saved')
      else if (error === 'denied') setSaveState('denied')
      else { enqueue(payload, profile?.id); setSaveState('queued') }
    })
  }, [step, d.course, d.loading])                         // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson || !course) return contentReady ? <Navigate to="/adult/learn" replace /> : <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (d.loading) return <div className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></div>
  if (!d.enrolled) return <main className="ad-page"><p className="ad-big">{t('notEnrolled')}</p><Link className="ad-btn primary" to={course.route}>{t('toList')}</Link></main>
  const go = () => setIdx((i) => Math.min(i + 1, steps.length - 1))
  const nextL = nextInCourse(lesson.key)
  const voice = hasVoice('ha')
  const body = (() => {
    switch (step.type) {
      case 'teach': return <TeachStep step={step} name={name} onNext={go} />
      case 'show': return <ShowStep text={step.text} onNext={go} />
      case 'trace': return <TraceStep text={step.text} onAnswer={answer} onNext={go} />
      case 'write': return <WriteStep text={step.text} onAnswer={answer} onNext={go} />
      case 'calc': return <CalcStep item={step.item} onAnswer={answer} onNext={go} />
      case 'pick': {
        const f = step.problem ? formatItem(step.problem) : null
        return <ChoiceStep kind="pick" prompt={t(step.promptKey, step.vars)} onAnswer={answer} onNext={go} options={step.options} target={step.target}
          big={f ? <Pre className="ad-huge">{f.textKey ? t(f.textKey, f.vars) : f.expr}</Pre> : step.dots ? <Dots n={step.dots} /> : null} />
      }
      case 'tap': return <TapStep step={step} onAnswer={answer} onNext={go} />
      case 'dchoice': return <ChoiceStep kind="pick" prompt={t(step.promptKey)} options={step.optionKeys.map((x) => t(x))} target={t(step.targetKey)} why={step.whyKey ? t(step.whyKey) : null} onAnswer={answer} onNext={go}
        big={step.cardKey ? <div className="ad-msgcard" role="note"><span className="ad-note">{t('dlFrom')}</span><p className="ad-big">{t(step.cardKey)}</p></div> : null} extra={<>{step.cardKey && <AdultAudio text={t(step.cardKey)} audioKey={step.cardKey} big />}<AdultAudio text={t(step.promptKey)} audioKey={step.promptKey} /></>} />
      case 'match': return <ChoiceStep kind="match" prompt={t('matchPrompt')} big={<p className="ad-giant">{step.prompt}</p>} options={step.options} target={step.target} onAnswer={answer} onNext={go} />
      case 'find': {
        const hear = voice && (step.kind === 'sameWord' || step.kind === 'sameSentence')   // with a Hausa voice this becomes a real reading task
        if (step.kind === 'hasLetter') return <ChoiceStep kind="find" prompt={t('findHasLetter', { upper: step.letter })} big={<p className="ad-giant small">{step.letter}</p>} options={step.options} target={step.target} onAnswer={answer} onNext={go} />
        return <ChoiceStep kind="find" prompt={t(hear ? 'findHear' : 'findSame')} big={hear ? null : <p className="ad-giant small">{step.target}</p>} extra={hear ? <AdultAudio text={step.target} lang="ha" big /> : null} options={step.options} target={step.target} onAnswer={answer} onNext={go} />
      }
      default: return <ReviewStep results={results} saveState={saveState} next={nextL} onList={() => nav(course.route)} />
    }
  })()
  return (
    <main className="ad-page" key={lesson.key + ':' + idx}>
      <div className="ad-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={idx}><i style={{ width: (idx / (steps.length - 1)) * 100 + '%' }} /></div>
      <p className="ad-note">{lessonTitle(t, lesson)}</p>
      {body}
      {idx > 0 && step.type !== 'review' && <button className="ad-link" onClick={() => setIdx(idx - 1)}>{t('back')}</button>}
      {step.type !== 'review' && <Link className="ad-link" to={course.route}>{t('toList')}</Link>}
    </main>
  )
}

// /adult/c/<slug>: a course written in the dashboard (or any course by its address name)
export function CourseBySlug() { const { slug } = useParams(); return <LessonList key={slug} slug={slug} /> }
