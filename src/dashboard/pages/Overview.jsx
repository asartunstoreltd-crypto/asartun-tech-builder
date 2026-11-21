import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { staffApi } from '../../adult/adultApi.js'
import { visibleNav, navPath, roleLabels } from '../access.js'
import { useDash } from '../DashAuth.jsx'
import { listStaff } from '../dashApi.js'

// Real numbers only: each one is read from the database through the caller's own permissions (a teacher sees only their own classes and learners).
export default function Overview() {
  const { ctx } = useDash()
  const [stats, setStats] = useState(null)
  useEffect(() => {
    if (!ctx.hasAdult) return undefined
    let live = true
    ;(async () => {
      const [c, l] = await Promise.all([staffApi.classes(), staffApi.learners('')])
      const out = { error: Boolean(c.error || l.error), classes: (c.data || []).filter((x) => x.status === 'active').length, learners: (l.data || []).length }
      if (ctx.isAdultAdmin) { try { const s = await listStaff(); out.staff = s.filter((x) => x.active).length; out.suspended = s.length - out.staff } catch { out.error = true } }
      if (live) setStats(out)
    })()
    return () => { live = false }
  }, [ctx.hasAdult, ctx.isAdultAdmin])
  const links = visibleNav(ctx).filter((n) => !['overview', 'settings'].includes(n.id))
  return (
    <div className="dash-stack">
      <div className="dash-card"><h2>Welcome</h2><p className="dash-muted">Signed in as {roleLabels(ctx).join(' · ')}.</p></div>
      {ctx.hasAdult && (
        <div className="dash-stats" aria-busy={!stats}>
          {!stats ? <p className="dash-muted">Loading numbers…</p> : <>
            <Stat n={stats.classes} l={ctx.isAdultAdmin ? 'Active classes' : 'Your active classes'} />
            <Stat n={stats.learners >= 300 ? '300+' : stats.learners} l={ctx.isAdultAdmin ? 'Learners' : 'Learners in your classes'} />
            {ctx.isAdultAdmin && <><Stat n={stats.staff ?? '—'} l="Active staff" /><Stat n={stats.suspended ?? '—'} l="Suspended staff" /></>}
          </>}
          {stats && stats.error && <p className="dash-err" role="alert">Some numbers could not be loaded.</p>}
        </div>)}
      <div className="dash-tiles">
        {links.map((n) => <Link key={n.id} to={navPath(n.id)} className="dash-tile"><b>{n.label}</b><span className="dash-muted">{n.group || 'Open'}</span></Link>)}
      </div>
    </div>
  )
}
const Stat = ({ n, l }) => <div className="dash-stat"><b>{n}</b><span>{l}</span></div>
