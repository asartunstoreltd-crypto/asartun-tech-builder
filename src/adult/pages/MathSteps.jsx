import { useMemo, useRef, useState } from 'react'
import { useAdult } from '../AdultAuth.jsx'
import { fmt, TENS } from '../numeracy.js'
import { hasInk } from '../lessonResults.js'
import HandwritingCanvas from '../components/HandwritingCanvas.jsx'
import AdultAudio from '../components/AdultAudio.jsx'

// Step components for the numeracy lessons (Phase 5). The lesson player in Lessons.jsx chooses which one to show.
// Marking rules: choices are marked by the app (onAnswer(true|false)); written answers are NEVER read by the app,
// the learner says how it went (onRate('yes'|'help'|'no')). The two are recorded separately.

export function Dots({ n }) {                                  // objects to count, in groups of five so they are easy to count
  const { t } = useAdult()
  const groups = []; for (let i = 0; i < n; i += 5) groups.push(Math.min(5, n - i))
  return <div className="ad-dotgroups" role="img" aria-label={t('dotsLabel', { n })}>{groups.map((g, i) => <span className="ad-dotgroup" key={i}>{Array.from({ length: g }, (_, k) => <i key={k} />)}</span>)}</div>
}
const Feedback = ({ ok, children }) => <p className={ok ? 'ad-ok ad-big' : 'ad-note ad-big'} role="status">{children}</p>
const canvasLabels = (t) => ({ pencil: t('pencil'), eraser: t('eraser'), undo: t('undo'), redo: t('redo'), clear: t('clear'), area: t('writeHere') })
const worked = (step) => (step.dots ? String(step.a) : step.q.includes('?') ? step.q.replace('?', fmt(step.a, step.u)) : fmt(step.a, step.u))

export function NumTeach({ step, onNext }) {
  const { t, lang } = useAdult()
  let body
  if (step.kind === 'digit') body = (<>
    <p className="ad-giant" aria-label={step.digit}>{step.digit}</p>
    <p className="ad-big">{t('teachDigit', { d: step.digit, word: step.word })}</p>
    <p className="ad-huge">{step.word}</p>
    {lang === 'en' && <p className="ad-note">{step.gloss}</p>}
    {Number(step.digit) > 0 && <Dots n={Number(step.digit)} />}
    <AdultAudio text={step.word} lang="ha" big />
  </>)
  else if (step.kind === 'tens') body = (<>
    <p className="ad-big">{t('nt_tens')}</p>
    <ul className="ad-tens">{TENS.map(([d, w, g]) => <li key={d}><strong>{d}</strong><span>{w}{lang === 'en' ? ' · ' + g : ''}</span></li>)}</ul>
  </>)
  else body = (<>
    {step.ctx && <p className="ad-note">{t(step.ctx)}</p>}
    <p className="ad-big">{t(step.kind === 'check' ? 'nt_check' : 'nt_' + step.id)}</p>
    {step.example && <p className="ad-sum" aria-label={worked({ q: step.example[0], a: step.example[1], u: step.u })}>{worked({ q: step.example[0], a: step.example[1], u: step.u })}</p>}
  </>)
  return <>{body}<button className="ad-btn primary" onClick={onNext}>{t('next')}</button></>
}

// One multiple-choice question, marked by the app. options and target are numbers or strings of the same kind.
export function ChoiceStep({ prompt, big, extra, options, target, label = String, kind = 'letter', onAnswer, onNext }) {
  const { t } = useAdult()
  const [picked, setPicked] = useState(null)
  const pick = (o) => { if (picked !== null) return; setPicked(o); onAnswer(o === target) }
  return (<>
    <p className="ad-big">{prompt}</p>
    {extra}
    {big}
    <div className="ad-grid" data-kind={kind}>
      {options.map((o) => <button key={String(o)} className={'ad-btn ad-opt' + (picked !== null && o === target ? ' right' : picked === o ? ' wrong' : '')} disabled={picked !== null && picked !== o && o !== target} onClick={() => pick(o)}>{label(o)}</button>)}
    </div>
    {picked !== null && (picked === target ? <Feedback ok>{t('rightAnswer')}</Feedback> : <Feedback>{t('wrongAnswer', { answer: label(target) })}</Feedback>)}
    {picked !== null && <button className="ad-btn primary" onClick={onNext}>{t('next')}</button>}
  </>)
}

export function PickNumberStep({ step, onAnswer, onNext }) {
  const { t } = useAdult()
  return <ChoiceStep prompt={t('pickNumberPrompt')} big={<p className="ad-huge">{step.word}</p>} extra={<AdultAudio text={step.word} lang="ha" big />} options={step.options} target={step.target} onAnswer={onAnswer} onNext={onNext} />
}
export function CountStep({ step, onAnswer, onNext }) {
  const { t } = useAdult()
  return <ChoiceStep prompt={t('countPrompt')} big={<Dots n={step.n} />} options={step.options} target={step.target} onAnswer={onAnswer} onNext={onNext} />
}
export function CompareStep({ step, onAnswer, onNext }) {
  const { t } = useAdult()
  return <ChoiceStep prompt={t(step.ask === 'bigger' ? 'comparePromptBigger' : 'comparePromptSmaller')} options={step.options} target={step.target} onAnswer={onAnswer} onNext={onNext} />
}
export function QuizStep({ step, onAnswer, onNext }) {
  const { t } = useAdult()
  return <ChoiceStep prompt={t('quizPrompt')} extra={step.ctx ? <p className="ad-note">{t(step.ctx)}</p> : null} big={<p className="ad-sum">{step.q}</p>} options={step.options} target={step.a} label={(o) => fmt(o, step.u)} kind="quiz" onAnswer={onAnswer} onNext={onNext} />
}

// Write the answer with a finger.  write -> (Done | I do not know) -> the correct answer is shown, the ink stays visible
// -> the learner says same / nearly / different -> next.  Nothing here reads the handwriting.
export function CalcStep({ step, onRate, onNext }) {
  const { t } = useAdult()
  const [phase, setPhase] = useState('write')                 // write | shown | rated
  const [ink, setInk] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [rating, setRating] = useState(null)
  const cv = useRef(null)
  const aspect = useMemo(() => (String(step.a).length >= 4 ? 3 : 2.4), [step.a])
  const labels = useMemo(() => canvasLabels(t), [t])
  const idk = () => { setSkipped(true); setRating('no'); onRate('no'); setPhase('rated') }
  const rate = (r) => { if (rating) return; setRating(r); onRate(r); setPhase('rated') }
  return (<>
    {step.ctx && <p className="ad-note">{t(step.ctx)}</p>}
    <p className="ad-big">{t(step.dots ? 'calcDots' : 'calcPrompt')}</p>
    {step.dots ? <Dots n={step.dots} /> : <p className="ad-sum">{step.q}</p>}
    <HandwritingCanvas ref={cv} aspect={aspect} labels={labels} disabled={phase !== 'write'} onChange={(s) => setInk(hasInk(s))} />
    {phase === 'write' && (<div className="ad-stack">
      {!ink && <p className="ad-note">{t('calcWriteFirst')}</p>}
      <button className="ad-btn primary" disabled={!ink} onClick={() => setPhase('shown')}>{t('calcDone')}</button>
      <button className="ad-btn" onClick={idk}>{t('calcIdk')}</button>
    </div>)}
    {phase !== 'write' && (<>
      <p className="ad-note">{t('calcCorrect')}</p>
      <p className="ad-sum" role="status">{worked(step)}</p>
      {phase === 'shown' && (<>
        <p className="ad-big">{t('calcAsk')}</p><p className="ad-note">{t('calcHonest')}</p>
        <div className="ad-stack">
          <button className="ad-btn primary" onClick={() => rate('yes')}>{t('calcSame')}</button>
          <button className="ad-btn" onClick={() => rate('help')}>{t('calcNearly')}</button>
          <button className="ad-btn" onClick={() => rate('no')}>{t('calcDiff')}</button>
        </div></>)}
      {phase === 'rated' && (<>
        {(skipped || rating === 'no') && <Feedback>{t('calcSkipped')}</Feedback>}
        <button className="ad-btn primary" onClick={onNext}>{t('next')}</button></>)}
    </>)}
  </>)
}
