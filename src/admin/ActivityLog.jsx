import { useEffect, useState } from 'react'
import { loadLogs } from './api.js'

// Super Admin only (the database refuses everyone else). Learners can never read this table.
export default function ActivityLog() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { loadLogs().then(setD).catch((e) => setErr(e.message)) }, [])
  if (err) return <p className="adm-err">{err}</p>
  if (!d) return <p>Loading…</p>
  return (
    <>
      <h2>Admin activity log</h2>
      <p className="adm-note">The last 200 changes. Only Super Admins can see this. It is written by the database, so it cannot be edited here.</p>
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr><th>When</th><th>Who</th><th>Did</th><th>What</th><th>Details</th></tr></thead>
        <tbody>{d.logs.map((l) => (
          <tr key={l.id}>
            <td>{new Date(l.created_at).toLocaleString()}</td>
            <td>{d.names[l.actor_id] || (l.actor_id ? 'an admin' : 'system')}</td>
            <td>{l.action}</td><td>{l.entity}</td>
            <td><small>{Object.entries(l.details || {}).filter(([k]) => k !== 'mission_id').map(([k, v]) => `${k}: ${v}`).join(' · ')}</small></td>
          </tr>))}</tbody>
      </table></div>
    </>
  )
}
