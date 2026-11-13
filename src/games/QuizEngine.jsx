import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import Confetti from '../components/Confetti'
import AudioButton from '../components/AudioButton'

// TEST stage. Wrong answers are never punished: show the explanation, then try again.
// questions [{q, a:[...], c:index, e:{ha,en}}]
export default function QuizEngine({ questions, onCorrect, onFinish, idPrefix }) {
  const { t, L } = useLang()
  const [i, setI] = useState(0)
  const [tried, setTried] = useState([])
  const [ok, setOk] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const cur = questions[i]
  const choose = (n) => {
    if (ok || tried.includes(n)) return
    if (n === cur.c) { setOk(true); if (tried.length === 0) setScore(score + 1); onCorrect(i) }
    else setTried([...tried, n])
  }
  const advance = () => { if (i + 1 < questions.length) { setI(i + 1); setTried([]); setOk(false) } else setDone(true) }
  if (done) return (
    <div className="card center-text"><Confetti /><div className="big bounce">🎉</div>
      <h3>{t('quizDone')}</h3><p>{t('score', { s: score, n: questions.length })}</p>
      <button className="btn" onClick={onFinish}>{t('claim')}</button></div>
  )
  return (
    <div className="card">
      <p className="small">{t('qOf', { n: i + 1, m: questions.length })}</p>
      <h3>{L(cur.q)}</h3>
      {idPrefix && <AudioButton id={idPrefix + '.' + i} />}
      {cur.a.map((ans, n) => (
        <button key={n} onClick={() => choose(n)} disabled={tried.includes(n)}
          className={'opt' + (ok && n === cur.c ? ' right' : '') + (tried.includes(n) ? ' wrong' : '')}>{L(ans)}</button>
      ))}
      {tried.length > 0 && !ok && <div className="help"><p className="bad">{t('quizWrong')}</p><p><b>{t('explain')}:</b> {L(cur.e)}</p></div>}
      {ok && <><p className="good">{t('quizRight')}</p><p>{L(cur.e)}</p><button className="btn" onClick={advance}>{i + 1 < questions.length ? t('nextQ') : t('seeResult')}</button></>}
    </div>
  )
}
