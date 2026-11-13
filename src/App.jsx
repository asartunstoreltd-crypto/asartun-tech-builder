import { useEffect, useState } from 'react'
import { useLang } from './lib/i18n.jsx'
import MissionEngine from './components/MissionEngine'
import { useMissions } from './lib/useMissions.js'
import { flush, heartbeat, joinWithCode, logWrong, sendEvent, startProfile, syncAll } from './lib/learnerSync.js'
import { isSupabaseConfigured } from './lib/supabase.js'
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
  const { list: missions, content, loading, refresh } = useMissions()
  const [s, setS] = useState(load)
  const [view, setView] = useState(s.nick ? 'dashboard' : 'welcome')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { try { localStorage.setItem('atb', JSON.stringify(s)) } catch { /* ignore */ } }, [s])

  // The profile exists online as soon as the child has a game name; progress already earned is sent once.
  useEffect(() => {
    if (!isSupabaseConfigured || !s.nick) return
    startProfile(s.nick, s.age).then((ok) => {
      if (!ok) return
      let done = false
      try { done = localStorage.getItem('atb-synced') === '1' } catch { /* ignore */ }
      if (!done) { syncAll(s.earned); try { localStorage.setItem('atb-synced', '1') } catch { /* ignore */ } } else flush()
    })
  }, [s.nick]) // eslint-disable-line react-hooks/exhaustive-deps
  // Lets admins see who is using the app right now (a tiny ping every 2 minutes while the app is open).
  useEffect(() => {
    if (!isSupabaseConfigured || !s.nick) return undefined
    const id = setInterval(() => { if (document.visibilityState === 'visible') heartbeat() }, 120000)
    return () => clearInterval(id)
  }, [s.nick])

  // Each reward key is paid once, so replaying cannot farm points.
  const award = (key, pts, badge) => { if (isSupabaseConfigured && !s.earned.includes(key)) sendEvent(key); setS((p) => p.earned.includes(key) ? p : {
    ...p, points: p.points + pts, earned: [...p.earned, key],
    badges: badge && !p.badges.includes(badge) ? [...p.badges, badge] : p.badges }) }
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
      {isSupabaseConfigured && <>
        <select className="input" value={age} onChange={(e) => setAge(e.target.value)} aria-label={t('ageLabel')}>
          <option value="">{t('ageLabel')}</option>
          {['5-7', '8-10', '11-13', '14-17'].map((b) => <option key={b} value={b}>{t('ageBands')[b]}</option>)}
        </select>
        <input className="input" maxLength={12} placeholder={t('orgCodeLabel')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <p className="small">{t('orgCodeHelp')}</p>
      </>}
      <button className="btn" disabled={!name.trim()} onClick={() => {
        setS({ ...s, nick: name.trim(), age })
        setView('dashboard')
        if (isSupabaseConfigured && code.trim()) {
          startProfile(name.trim(), age)
            .then(() => joinWithCode(code))
            .then((r) => { setNotice(t('joinOk', { org: r.org })); refresh() })
            .catch(() => setNotice(t('joinBad')))
        }
      }}>{t('start')}</button>
    </div>
  )
  else if (content[view]) body = <MissionEngine mission={content[view]} state={s} award={award} track={logWrong} onExit={() => setView('dashboard')} />
  else body = (
    <>
      {view === 'rewards' && <Rewards state={s} />}
      {view === 'parent' && <Parent state={s} content={content} />}
      {view === 'settings' && <Settings state={s} setState={setS} onReset={reset} onJoined={refresh} />}
      {view === 'dashboard' && (
        <div className="page">
          <header className="top">
            <div><h2>{t('hi', { name: s.nick })} 👋</h2><p className="small">{t('tagline')}</p></div>
            <div className="pts">⭐ {s.points}</div>
          </header>
          <h3>{t('missions')}</h3>
          {loading && <p className="small">⏳</p>}
          {notice && <p className="warn" onClick={() => setNotice('')}>{notice}</p>}
          <div className="grid">
            {missions.map((m) => (
              <button key={m.id} className={'card mission' + (m.ready ? '' : ' locked')} disabled={!m.ready} onClick={() => setView(m.id)}>
                {m.coverUrl && m.ready ? <img className="cover" src={m.coverUrl} alt="" /> : <span className="big">{m.ready ? m.emoji : '🔒'}</span>}
                <b>{t('mission')} {String(m.no).padStart(2, '0')}</b><span>{L(m.title)}</span>
                {!m.ready && <span className="small">{m.premium ? t('premiumLock') : t('soon')}</span>}
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
