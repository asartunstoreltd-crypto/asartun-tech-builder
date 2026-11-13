import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { buildScript, getAudio } from '../lib/narration.js'
import { content } from '../data/registry'

// For the voice team. Open the app with  /#script  at the end of the address.
export default function ScriptPage() {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const rows = [...new Map(Object.values(content).flatMap(buildScript).map((r) => [r.id, r])).values()]
  const count = (l) => rows.filter((r) => getAudio(l, r.id)).length
  const csv = ['id,hausa,english', ...rows.map((r) => [r.id, r.ha, r.en].map((x) => '"' + x.replaceAll('"', '""') + '"').join(','))].join('\n')
  const copy = () => { try { navigator.clipboard.writeText(csv).then(() => setCopied(true)) } catch { /* ignore */ } }
  return (
    <div className="page">
      <h2>{t('scriptTitle')}</h2>
      <p>{t('scriptHelp')}</p>
      <p className="small">HAUSA {count('ha')} / {rows.length} · ENGLISH {count('en')} / {rows.length}</p>
      <button className="btn" onClick={copy}>{copied ? '✅ Copied' : 'Copy as CSV'}</button>
      <div className="tablewrap">
        <table className="script">
          <thead><tr><th>ID</th><th>HAUSA</th><th>ENGLISH</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><code>{r.id}</code></td>
              <td>{getAudio('ha', r.id) ? '✅ ' : '❌ '}{r.ha}</td>
              <td>{getAudio('en', r.id) ? '✅ ' : '❌ '}{r.en}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
