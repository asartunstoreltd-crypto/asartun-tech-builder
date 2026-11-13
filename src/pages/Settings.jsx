import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
export default function Settings({ state, setState, onReset }) {
  const { t, lang, setLang } = useLang()
  const [n, setN] = useState(state.nick)
  const [saved, setSaved] = useState(false)
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
      <div className="card"><h3>{t('privacy')}</h3><p className="small">{t('privacyText')}</p></div>
      <button className="btn ghost" onClick={() => { if (confirm(t('resetConfirm'))) onReset() }}>{t('reset')}</button>
    </div>
  )
}
