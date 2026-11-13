import { useCallback, useEffect, useState } from 'react'
import { Confirm, Field } from './ui.jsx'
import ResultsView from './ResultsView.jsx'
import InsightsView from './InsightsView.jsx'
import { useAdminAuth } from './AdminAuth.jsx'
import { adminInsights, adminLearnerResults, adminLearners, ago, downloadCsv, grantPremium, listOrgs, liveStats } from './api2.js'

const Stat = ({ icon, label, value }) => <div className="adm-stat"><span className="adm-ico">{icon}</span><b>{value ?? '–'}</b><span>{label}</span></div>

export default function Learners() {
  const { hasRole } = useAdminAuth()
  const [tab, setTab] = useState('list')
  const [live, setLive] = useState(null)
  const [rows, setRows] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [search, setSearch] = useState('')
  const [org, setOrg] = useState('')
  const [open, setOpen] = useState(null)
  const [ins, setIns] = useState(null)
  const [err, setErr] = useState('')
  const [days, setDays] = useState(30)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    adminLearners(search, org).then(setRows).catch((e) => setErr(e.message))
    liveStats().then(setLive).catch(() => {})
  }, [search, org])
  useEffect(() => { load() }, [load])
  useEffect(() => { listOrgs().then(setOrgs).catch(() => {}) }, [])
  useEffect(() => { if (tab === 'insights' && !ins) adminInsights().then(setIns).catch((e) => setErr(e.message)) }, [tab, ins])

  const show = async (id) => { try { setMsg(''); setOpen(await adminLearnerResults(id)) } catch (e) { setErr(e.message) } }
  const give = async () => {
    try {
      const until = new Date(Date.now() + days * 86400000).toISOString()
      await grantPremium(open.id, null, until, note)
      setMsg(`Premium given for ${days} days.`); setOpen(await adminLearnerResults(open.id)); load()
    } catch (e) { setMsg(e.message) }
  }
  const csv = () => downloadCsv('learners.csv', [['Nickname', 'Age band', 'Points', 'Missions completed', 'Last active', 'Groups', 'Premium'],
    ...(rows || []).map((r) => [r.nickname, r.age_band, r.points, r.missions_completed, r.last_active_at, r.orgs, r.premium ? 'yes' : 'no'])])

  return (
    <>
      <h2>Learners</h2>
      {live && (
        <div className="adm-grid">
          <Stat icon="🟢" label="Online now (5 min)" value={live.online_now} />
          <Stat icon="📅" label="Active today" value={live.active_today} />
          <Stat icon="🔥" label="Active, 7 days" value={live.active_7d} />
          <Stat icon="🆕" label="New today" value={live.new_today} />
          <Stat icon="👧🏾" label="All learners" value={live.total} />
          <Stat icon="⭐" label="Premium learners" value={live.premium_learners} />
        </div>
      )}
      {err && <p className="adm-err">{err}</p>}
      <div className="adm-tabs">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>Learners</button>
        <button className={tab === 'insights' ? 'on' : ''} onClick={() => setTab('insights')}>Where learners struggle</button>
      </div>
      {tab === 'insights' && (ins ? <InsightsView data={ins} /> : <p>Loading…</p>)}
      {tab === 'list' && (
        <>
          <div className="adm-actions">
            <input placeholder="Search nickname…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={org} onChange={(e) => setOrg(e.target.value)}>
              <option value="">All groups</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="adm-btn ghost" onClick={csv}>Download CSV</button>
          </div>
          <p className="adm-note">Only game names are stored. Every time you open a child’s record it is written to the activity log.</p>
          {!rows ? <p>Loading…</p> : (
            <div className="adm-tablewrap"><table className="adm-table">
              <thead><tr><th></th><th>Nickname</th><th>Age</th><th>Points</th><th>Missions done</th><th>Last active</th><th>Group</th><th>⭐</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="adm-click" onClick={() => show(r.id)}>
                  <td>{r.online ? '🟢' : ''}</td><td><b>{r.nickname}</b></td><td>{r.age_band || '–'}</td><td>{r.points}</td>
                  <td>{r.missions_completed}</td><td>{ago(r.last_active_at)}</td><td>{r.orgs || '–'}</td><td>{r.premium ? '⭐' : ''}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          {rows && rows.length === 0 && <p className="adm-empty">No learners yet. They appear after children start the app with Supabase connected.</p>}
        </>
      )}
      {open && (
        <Confirm title="Learner results" yesText="Close" danger={false} onYes={() => setOpen(null)} onNo={() => setOpen(null)}>
          <ResultsView data={open} />
          <h4>Premium</h4>
          <p>{open.premium ? '⭐ Premium is active for this learner.' : 'No premium.'}</p>
          {hasRole('super_admin') && (
            <div className="adm-sub">
              <Field label="Give premium for (days)"><input type="number" min="1" max="3650" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
              <Field label="Note (e.g. paid by parent, gift)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <button className="adm-btn" onClick={give}>Give premium</button>
              {msg && <p className="adm-note">{msg}</p>}
            </div>
          )}
        </Confirm>
      )}
    </>
  )
}
