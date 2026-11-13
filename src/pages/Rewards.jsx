import { useLang } from '../lib/i18n.jsx'
import { badges } from '../data/missions'
export default function Rewards({ state }) {
  const { t, L } = useLang()
  return (
    <div className="page">
      <h2>{t('rewardsTitle')}</h2>
      <div className="card center-text"><div className="big bounce">⭐ {state.points}</div><p>{t('pointsEarned')}</p></div>
      {badges.map((b) => {
        const got = state.badges.includes(b.id)
        return <div key={b.id} className={'card row' + (got ? '' : ' locked')}><span className="big">{got ? '🏅' : '🔒'}</span><div><b>{L(b.name)}</b><br /><span className="small">{L(b.how)}</span></div></div>
      })}
    </div>
  )
}
