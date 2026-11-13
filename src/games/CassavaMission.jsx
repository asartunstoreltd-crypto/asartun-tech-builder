import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { cassavaProducts, badges } from '../data/missions'
import { cassavaQuiz } from '../data/quizzes'
import FactoryGame from './FactoryGame'
import BusinessCalculator from './BusinessCalculator'
import QuizEngine from './QuizEngine'
import SortGame from './SortGame'
import Guide from '../components/Guide'
import Confetti from '../components/Confetti'

function ProductTabs({ prod, setProd }) {
  const { L } = useLang()
  return (
    <div className="chips">{cassavaProducts.map((p) => (
      <button key={p.id} className={'chip' + (p.id === prod.id ? ' on' : '')} onClick={() => setProd(p)}>{p.emoji} {L(p.name)}</button>))}
    </div>
  )
}

export default function CassavaMission({ state, award, onExit }) {
  const { t, L } = useLang()
  const [stage, setStage] = useState(0)
  const [line, setLine] = useState(0)
  const [prod, setProd] = useState(cassavaProducts[0])
  const names = t('stageNames')
  const total = names.length
  const next = () => setStage((s) => Math.min(s + 1, total - 1))
  const story = t('story')
  return (
    <div className="page">
      <button className="btn ghost" onClick={onExit}>{t('back')}</button>
      <h2>{t('missionTitle')}</h2>
      <div className="steps">{names.map((n, i) => <span key={n} className={'dot' + (i === stage ? ' now' : i < stage ? ' past' : '')} title={n} />)}</div>
      <p className="small">{t('stageOf', { n: stage + 1, m: total })}: <b>{names[stage]}</b></p>

      {stage === 0 && (
        <div className="card center-text">
          <div className="big bounce">{['🧑🏾‍🔧', '🧑🏾‍🌾', '🌿', '🤝'][line]}</div>
          <h3 className="story">{story[line]}</h3>
          {line < story.length - 1
            ? <button className="btn" onClick={() => setLine(line + 1)}>{t('next')}</button>
            : <><p className="chain">{t('chain')}</p><button className="btn" onClick={() => { award('discover', 5); next() }}>{t('start')}</button></>}
        </div>
      )}

      {stage === 1 && <><Guide say={t('gSort')} /><SortGame onDone={() => { award('sort', 5); next() }} /></>}

      {stage === 2 && (
        <div>
          <Guide say={t('gProducts')} />
          <ProductTabs prod={prod} setProd={setProd} />
          <div className="card center-text">
            <div className="big bounce">{prod.emoji}</div>
            <h3>{L(prod.name)}</h3>
            <p>{L(prod.desc)}</p>
            <p><b>{t('uses')}:</b> {L(prod.uses)}</p>
            <p>💡 <b>{t('fact')}</b> {L(prod.fact)}</p>
          </div>
          <button className="btn" onClick={() => { award('products', 10, 'Resource Explorer'); next() }}>{t('goFactory')}</button>
        </div>
      )}

      {stage === 3 && (
        <div>
          <div className="warn">{t('safety')}</div>
          <Guide say={t('gFactory')} />
          <ProductTabs prod={prod} setProd={setProd} />
          <FactoryGame key={prod.id} product={prod} onWin={() => award('factory-' + prod.id, 10, 'Young Inventor')} />
          <button className="btn" onClick={next}>{t('next')}</button>
        </div>
      )}

      {stage === 4 && (
        <div>
          <Guide say={t('gBusiness')} />
          <BusinessCalculator onDone={() => award('business', 15, 'Smart Builder')} />
          <button className="btn" onClick={next}>{t('toQuiz')}</button>
        </div>
      )}

      {stage === 5 && (
        <div>
          <Guide say={t('gQuiz')} />
          <QuizEngine questions={cassavaQuiz} onCorrect={(i) => award('quiz-' + i, 5)} onFinish={() => { award('finish', 10, 'Future Entrepreneur'); next() }} />
        </div>
      )}

      {stage === 6 && (
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
