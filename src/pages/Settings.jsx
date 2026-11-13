import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { deleteMyData, joinWithCode, leaveOrg, myMemberships, signOutLearner } from '../lib/learnerSync.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

export default function Settings({ state, setState, onReset, onJoined }) {
  const { t, lang, setLang } = useLang()
  const [n, setN] = useState(state.nick)
  const [saved, setSaved] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const load = () => { if (isSupabaseConfigured) myMemberships().then((r) => setOrgs(r || [])).catch(() => {}) }
  useEffect(load, [])
  const join = async () => {
    setMsg(null)
    try { const r = await joinWithCode(code); setMsg({ ok: t('joinOk', { org: r.org }) }); setCode(''); load(); if (onJoined) onJoined() } catch { setMsg({ err: t('joinBad') }) }
  }
  const leave = async (id) => { if (confirm(t('leaveConfirm'))) { try { await leaveOrg(id); load(); if (onJoined) onJoined() } catch { /* ignore */ } } }
  const wipe = async () => {
    if (!confirm(t('deleteConfirm'))) return
    try { await deleteMyData() } catch { /* offline: local data is still cleared */ }
    await signOutLearner()
    try { localStorage.removeItem('atb-pending'); localStorage.removeItem('atb-synced') } catch { /* ignore */ }
    onReset()
  }
  return (
    <div className="page">
      <h2>{t('settingsTitle')}</h2>
      <div className="card">
        <label className="field">{t('nickLabel')}
          <input className="input" maxLength={16} value={n} onChange={(e) => { setN(e.target.value); setSaved(false) }} />
        </label>
        <button className="btn" disabled={!n.trim()} onClick={() => { setState({ ...state, nick: n.trim() }); setSaved(true) }}>{t('save')}</button>
        {saved && <span className="good">{t('saved')}</span>}
      </div>
      <div className="card"><h3>{t('langLabel')}</h3>
        <button className={'btn' + (lang === 'ha' ? '' : ' ghost')} onClick={() => setLang('ha')}>HAUSA</button>
        <button className={'btn' + (lang === 'en' ? '' : ' ghost')} onClick={() => setLang('en')}>ENGLISH</button>
      </div>
      {isSupabaseConfigured && (
        <div className="card"><h3>{t('mySchool')}</h3>
          {orgs.length === 0 && <p className="small">{t('noSchool')}</p>}
          {orgs.map((o) => (
            <div key={o.org_id}><p><b>{o.org_name}</b>{o.class_name ? ' · ' + o.class_name : ''}</p>
              <p className="small">{t('canSee', { org: o.org_name })}</p>
              <button className="btn ghost" onClick={() => leave(o.org_id)}>{t('leave')}</button></div>
          ))}
          <p className="small">{t('orgCodeHelp')}</p>
          <input className="input" maxLength={12} placeholder="ABCD1234" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="btn" disabled={code.trim().length < 4} onClick={join}>{t('joinBtn')}</button>
          {msg && <p className={msg.err ? 'bad' : 'good'}>{msg.err || msg.ok}</p>}
        </div>
      )}
      <div className="card"><h3>{t('privacy')}</h3><p className="small">{t('privacyText')}</p></div>
      <button className="btn ghost" onClick={() => { if (confirm(t('resetConfirm'))) onReset() }}>{t('reset')}</button>
      {isSupabaseConfigured && <button className="btn ghost" onClick={wipe}>{t('deleteOnline')}</button>}
    </div>
  )
}
