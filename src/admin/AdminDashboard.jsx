import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabase.js'

const Card = ({ icon, label, value }) => (
  <div className="adm-stat"><span className="adm-ico">{icon}</span><b>{value ?? '–'}</b><span>{label}</span></div>
)

// Aggregated numbers only (from admin_dashboard_stats). No child names or personal data are fetched here.
export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabaseAdmin.rpc('admin_dashboard_stats').then(({ data, error }) => {
      if (error) setErr('You do not have permission to view reports, or the database is not set up yet.')
      else setStats(data)
    })
  }, [])

  if (err) return <div className="adm-card"><p className="adm-err">{err}</p></div>
  if (!stats) return <p>Loading…</p>

  const maxEv = Math.max(1, ...stats.daily_activity.map((d) => d.events))
  const maxL = Math.max(1, ...stats.popular_missions.map((m) => m.learners))
  const rate = stats.total_learners ? Math.round((stats.completed_missions / Math.max(1, stats.total_learners)) * 100) / 100 : 0

  return (
    <>
      <h2>Dashboard</h2>
      <div className="adm-grid">
        <Card icon="👧🏾" label="Registered learners" value={stats.total_learners} />
        <Card icon="🔥" label="Active (last 7 days)" value={stats.active_learners} />
        <Card icon="📚" label="Published missions" value={stats.published_missions} />
        <Card icon="🏆" label="Missions completed" value={stats.completed_missions} />
        <Card icon="📈" label="Completions per learner" value={rate} />
      </div>

      <div className="adm-card">
        <h3>Most popular missions</h3>
        {stats.popular_missions.length === 0 && <p className="adm-sub">No activity yet.</p>}
        {stats.popular_missions.map((m) => (
          <div key={m.slug} className="adm-bar">
            <span>{m.title?.en ?? m.slug}</span>
            <div><i style={{ width: `${(m.learners / maxL) * 100}%` }} /></div>
            <span>{m.learners} started · {m.completed} done</span>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h3>Learning activity, last 7 days</h3>
        <div className="adm-cols">
          {stats.daily_activity.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.events}`}>
              <i style={{ height: `${(d.events / maxEv) * 100}%` }} />
              <small>{d.day.slice(5)}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
