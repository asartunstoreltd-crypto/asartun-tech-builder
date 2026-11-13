import { useEffect, useState } from 'react'
import { useLang } from './lib/i18n.jsx'
import MissionEngine from './components/MissionEngine'
import { useMissions } from './lib/useMissions.js'
import NavBar from './components/NavBar'
import LangSwitcher from './components/LangSwitcher'
import Rewards from './pages/Rewards'
import Parent from './pages/Parent'
import Settings from './pages/Settings'
import ScriptPage from './pages/ScriptPage'

const empty = { nick: '', points: 0, badges: [], earned: [] }
const load = () => { try { return { ...empty, ...JSON.parse(localStorage.getItem('atb') || '{}') } } catch { return empty } }

export default function App() {
  const { t, L } = useLang()
  const { list: missions, content, loading } = useMissions()
  const [s, setS] = useState(load)
  const [view, setView] = useState(s.nick ? 'dashboard' : 'welcome')
  const [name, setName] = useState('')
  useEffect(() => { try { localStorage.setItem('atb', JSON.stringify(s)) } catch { /* ignore */ } }, [s])

  // Each reward key is paid once, so replaying cannot farm points.
  const award = (key, pts, badge) => setS((p) => p.earned.includes(key) ? p : {
    ...p, points: p.points + pts, earned: [...p.earned, key],
    badges: badge && !p.badges.includes(badge) ? [...p.badges, badge] : p.badges })
  const reset = () => { setS(empty); setName(''); setView('welcome') }

  if (window.location.hash === '#script') return <><LangSwitcher /><ScriptPage /></>

  let body
  if (view === 'welcome') body = (
    <div className="page center">
      <div className="big bounce">🛠️</div>
      <h1>ASARTUN TECH BUILDER</h1>
      <p className="tag">{t('tagline')}</p>
      <p>{t('pickName')}</p>
      <input className="input" maxLength={16} placeholder={t('namePh')} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn" disabled={!name.trim()} onClick={() => { setS({ ...s, nick: name.trim() }); setView('dashboard') }}>{t('start')}</button>
    </div>
  )
  else if (content[view]) body = <MissionEngine mission={content[view]} state={s} award={award} onExit={() => setView('dashboard')} />
  else body = (
    <>
      {view === 'rewards' && <Rewards state={s} />}
      {view === 'parent' && <Parent state={s} content={content} />}
      {view === 'settings' && <Settings state={s} setState={setS} onReset={reset} />}
      {view === 'dashboard' && (
        <div className="page">
          <header className="top">
            <div><h2>{t('hi', { name: s.nick })} 👋</h2><p className="small">{t('tagline')}</p></div>
            <div className="pts">⭐ {s.points}</div>
          </header>
          <h3>{t('missions')}</h3>
          {loading && <p className="small">⏳</p>}
          <div className="grid">
            {missions.map((m) => (
              <button key={m.id} className={'card mission' + (m.ready ? '' : ' locked')} disabled={!m.ready} onClick={() => setView(m.id)}>
                {m.coverUrl && m.ready ? <img className="cover" src={m.coverUrl} alt="" /> : <span className="big">{m.ready ? m.emoji : '🔒'}</span>}
                <b>{t('mission')} {String(m.no).padStart(2, '0')}</b><span>{L(m.title)}</span>
                {!m.ready && <span className="small">{t('soon')}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <NavBar view={view} setView={setView} />
    </>
  )
  return <><LangSwitcher />{body}</>
}
