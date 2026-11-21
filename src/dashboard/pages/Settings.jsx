import { useState } from 'react'
import { applyUpdate, checkForUpdate } from '../../pwa/register.js'
import { useInstall } from '../../pwa/install.js'
import { useAdult } from '../../adult/AdultAuth.jsx'
import { roleLabels } from '../access.js'
import { useDash } from '../DashAuth.jsx'

export default function Settings() {
  const { email, ctx, signOut } = useDash()
  const { lang, setLang } = useAdult()
  const install = useInstall()
  const [msg, setMsg] = useState('')
  return (
    <div className="dash-stack">
      <div className="dash-card">
        <h2>Account</h2>
        <p>{email}</p>
        <p className="dash-muted">{roleLabels(ctx).join(' · ')}</p>
        <p className="dash-muted">Each role is granted separately. Being a Super Admin does not give adult-learning administration, and the other way round.</p>
        <button type="button" className="dash-btn" onClick={signOut}>Sign out</button>
      </div>
      {ctx.hasAdult && <div className="dash-card">
        <h2>Language of the adult-learning pages</h2>
        <div className="dash-actions">{[['ha', 'Hausa'], ['en', 'English']].map(([k, l]) => <button key={k} type="button" className={'dash-btn ' + (lang === k ? 'primary' : 'ghost')} aria-pressed={lang === k} onClick={() => setLang(k)}>{l}</button>)}</div>
      </div>}
      <div className="dash-card">
        <h2>App</h2>
        {install.installed ? <p>This app is installed on this device.</p> : install.canInstall
          ? <button type="button" className="dash-btn primary" onClick={install.prompt}>Install ASARTUN on this device</button>
          : <p className="dash-muted">If your browser supports it, use its “Install app” or “Add to Home screen” option.</p>}
        <div className="dash-actions"><button type="button" className="dash-btn ghost" onClick={async () => { const r = await checkForUpdate(); setMsg(r === 'waiting' ? 'An update is ready.' : r === 'none' ? 'You have the latest version.' : 'Updates are not available in this browser or mode.'); if (r === 'waiting') applyUpdate() }}>Check for updates</button></div>
        {msg && <p role="status">{msg}</p>}
        <p className="dash-muted">The app needs an internet connection to show any data. Only the app’s own files are kept on the device; learner records, submissions and sign-in details are never stored by the service worker.</p>
      </div>
    </div>
  )
}
