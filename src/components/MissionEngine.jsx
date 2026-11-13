import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { badges } from '../data/missions'
import ProcessDemo from './ProcessDemo'
import Guide from './Guide'
import Confetti from './Confetti'
import AudioButton from './AudioButton'
import OrderPractice from '../games/OrderPractice'
import SortGame from '../games/SortGame'
import BusinessCalculator from '../games/BusinessCalculator'
import QuizEngine from '../games/QuizEngine'

// Reusable mission engine: TEACH → SHOW → PRACTICE → TEST (challenge + quiz) → REWARD.
// Give it any mission object shaped like data/cassavaMission.js.
// New challenge types (circuit, solar...) are added to `challengeTypes`.
const safetyOptions = [{ kind: 'safe', labelKey: 'canDo', icon: '✅' }, { kind: 'adult', labelKey: 'askAdult', icon: '🙋' }]
const challengeTypes = {
  safety: (c, done) => <SortGame items={c.items} onDone={done} options={safetyOptions} askKey="safetyAsk" />,
  sort: (c, done) => <SortGame items={c.items} onDone={done} />,
  business: (c, done) => <BusinessCalculator onDone={done} />,
}

export default function MissionEngine({ mission, state, award, onExit }) {
  const { t, L } = useLang()
  const [stage, setStage] = useState(0)
  const [page, setPage] = useState(0)
  const [ch, setCh] = useState(0)
  const [proc, setProc] = useState(mission.procedures[0])
  const names = t('stageNames')
  const total = mission.stages.length
  const rw = mission.rewards
  const key = (x) => mission.id + ':' + x
  const has = (x) => state.earned.includes(key(x))
  const aw = (x, spec) => { const [p, b] = Array.isArray(spec) ? spec : [spec]; award(key(x), p, b) }
  const next = () => setStage((s) => Math.min(s + 1, total - 1))
  const cur = mission.stages[stage]

  const Tabs = ({ prefix }) => (
    <div className="chips">{mission.procedures.map((p) => (
      <button key={p.id} className={'chip' + (p.id === proc.id ? ' on' : '')} onClick={() => setProc(p)}>
        {p.emoji} {L(p.name)} {has(prefix + '-' + p.id) ? '✅' : ''}
      </button>))}
    </div>
  )

  const pages = mission.teach
  const pg = pages[page]
  const allShown = mission.procedures.every((p) => has('show-' + p.id))
  const anyPracticed = mission.procedures.some((p) => has('practice-' + p.id))
  const chal = mission.challenges[ch]
  const chalDone = chal && has('challenge-' + chal.key)

  return (
    <div className="page">
      <button className="btn ghost" onClick={onExit}>{t('back')}</button>
      <h2>{t('mission')} {String(mission.no).padStart(2, '0')} — {L(mission.title)}</h2>
      <div className="steps">{names.map((n, i) => <span key={n} className={'dot' + (i === stage ? ' now' : i < stage ? ' past' : '')} title={n} />)}</div>
      <p className="small">{t('stageOf', { n: stage + 1, m: total })}: <b>{names[stage]}</b></p>

      {cur === 'teach' && (
        <div className={'card center-text' + (pg.warn ? ' warnbox' : '')} key={page}>
          <p className="small">{t('pageOf', { n: page + 1, m: pages.length })}</p>
          <div className="big bounce">{pg.emoji}</div>
          <h3 className="story">{L(pg.title)}</h3>
          {pg.lines.map((ln, i) => <p key={i} className="line">{ln.k && <b>{t(ln.k)} </b>}{L(ln.text)}</p>)}
          <AudioButton id={mission.id + '.teach.' + page} />
          <div>
            {page > 0 && <button className="btn ghost" onClick={() => setPage(page - 1)}>{t('back')}</button>}
            {page < pages.length - 1
              ? <button className="btn" onClick={() => setPage(page + 1)}>{t('next')}</button>
              : <button className="btn" onClick={() => { aw('teach', rw.teach); next() }}>{t('teachDone')}</button>}
          </div>
        </div>
      )}

      {cur === 'show' && (
        <div>
          <Guide say={t('gShow')} audioId="ui.gShow" />
          <div className="warn">{mission.mixed ? t('mixedNote') : t('adultOnly')}</div>
          <Tabs prefix="show" />
          <ProcessDemo key={proc.id} items={proc.steps.map((id) => ({ ...mission.steps[id], id: mission.id + '.step.' + id }))} result={proc.result} summary={proc.summary} onFinished={() => aw('show-' + proc.id, rw.show)} />
          {allShown ? <button className="btn" onClick={next}>{t('next')}</button> : <p className="small">{t('needShow')}</p>}
        </div>
      )}

      {cur === 'practice' && (
        <div>
          <Guide say={t('gPractice')} audioId="ui.gPractice" />
          <Tabs prefix="practice" />
          <OrderPractice key={proc.id} procedure={proc} steps={mission.steps} onDone={() => aw('practice-' + proc.id, rw.practice)} />
          {anyPracticed ? <button className="btn" onClick={next}>{t('next')}</button> : <p className="small">{t('needPractice')}</p>}
        </div>
      )}

      {cur === 'challenge' && (
        <div>
          <Guide say={t('gChallenge')} audioId="ui.gChallenge" />
          {challengeTypes[chal.type](chal, () => aw('challenge-' + chal.key, rw[chal.key]))}
          {chalDone && <button className="btn" onClick={() => (ch < mission.challenges.length - 1 ? setCh(ch + 1) : next())}>{t('continue')}</button>}
        </div>
      )}

      {cur === 'quiz' && (
        <div>
          <Guide say={t('gQuiz')} audioId="ui.gQuiz" />
          <QuizEngine idPrefix={mission.id + '.quiz'} questions={mission.quiz} onCorrect={(i) => aw('quiz-' + i, rw.quiz)} onFinish={() => { aw('finish', rw.finish); next() }} />
        </div>
      )}

      {cur === 'reward' && (
        <div className="card center-text">
          <Confetti />
          <div className="big bounce">🏆</div>
          <h3>{t('done')}</h3>
          <p>{t('gDone')}</p>
          <p>⭐ <b>{state.points}</b> {t('pts')}</p>
          <div className="chips">{badges.map((b) => {
            const got = state.badges.includes(b.id)
            return <span key={b.id} className={'badge' + (got ? ' got' : '')}>{got ? '🏅' : '🔒'} {L(b.name)}</span>
          })}</div>
          <button className="btn" onClick={onExit}>{t('backHome')}</button>
        </div>
      )}
    </div>
  )
}
