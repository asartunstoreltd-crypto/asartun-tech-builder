import { useCallback, useEffect, useState } from 'react'
import { entitlements, revokePremium } from './api2.js'

export default function Premium() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => entitlements().then(setRows).catch((e) => setErr(e.message)), [])
  useEffect(() => { load() }, [load])
  const end = async (id) => { if (window.confirm('End this premium now?')) { try { await revokePremium(id); load() } catch (e) { setErr(e.message) } } }
  return (
    <>
      <h2>Premium access</h2>
      <p className="adm-note">Give premium from a learner (Learners page) or an organization (Organizations → Premium). Mark a mission as ⭐ Premium in its Details tab. Online payments (Paystack / Flutterwave) are not connected yet: until then you grant premium by hand after payment.</p>
      {err && <p className="adm-err">{err}</p>}
      {!rows ? <p>Loading…</p> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Who</th><th>Type</th><th>Source</th><th>From</th><th>Until</th><th>Note</th><th>Given by</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td><b>{r.who}</b></td><td>{r.kind}</td><td>{r.source}</td><td>{new Date(r.starts_at).toLocaleDateString()}</td>
              <td>{r.ends_at ? new Date(r.ends_at).toLocaleDateString() : 'no end'} {r.active ? '✅' : '⛔'}</td><td>{r.note || ''}</td><td>{r.granted_by_email || ''}</td>
              <td>{r.active && <button className="adm-btn ghost" onClick={() => end(r.id)}>End now</button>}</td></tr>))}</tbody>
        </table></div>
      )}
      {rows && rows.length === 0 && <p className="adm-empty">No premium given yet.</p>}
    </>
  )
}
