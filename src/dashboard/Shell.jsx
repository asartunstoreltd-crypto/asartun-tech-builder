import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Award, Baby, BarChart3, BookOpen, Building2, CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, FileText, Gem, GraduationCap, Image, LayoutDashboard, Layers, LogOut, Menu, Rocket, School, Settings, UserCheck, UserCog, Users, Wallet, X } from 'lucide-react'
import { GROUPS, NAV_BY_ID, navPath, roleLabels, sectionOf, visibleNav } from './access.js'
import { useDash } from './DashAuth.jsx'

const ICONS = { Activity, Award, Baby, BarChart3, BookOpen, Building2, CalendarCheck, ClipboardList, FileText, Gem, GraduationCap, Image, LayoutDashboard, Layers, Rocket, School, Settings, UserCheck, UserCog, Users, Wallet }
const PREF = 'atb-ui-dash-collapsed'                                  // a harmless layout preference (not user data), so it is kept across sign-outs

export default function Shell() {
  const { ctx, email, signOut } = useDash()
  const loc = useLocation()
  const [open, setOpen] = useState(false)                             // mobile drawer
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(PREF) === '1' } catch { return false } })
  const items = useMemo(() => visibleNav(ctx), [ctx])
  const current = NAV_BY_ID[sectionOf(loc.pathname)]

  useEffect(() => { setOpen(false) }, [loc.pathname])                // the drawer closes after choosing an item
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem(PREF, n ? '1' : '0') } catch { /* ignore */ } return n })
  useEffect(() => { document.title = (current ? current.label + ' · ' : '') + 'ASARTUN Dashboard' }, [current])

  return (
    <div className={'dash' + (collapsed ? ' collapsed' : '')}>
      <a className="dash-skip" href="#dash-main">Skip to main content</a>
      <aside id="dash-side" className={'dash-side' + (open ? ' open' : '')} aria-label="Main navigation">
        <div className="dash-brand"><span aria-hidden="true">🛠️</span><b>ASARTUN</b></div>
        <nav>
          {GROUPS.map((g) => {
            const list = items.filter((n) => n.group === g)
            if (!list.length) return null
            return (
              <div key={g || 'top'} className="dash-group">
                {g && <p className="dash-group-title">{g}</p>}
                {list.map((n) => { const Icon = ICONS[n.icon]; return (
                  <NavLink key={n.id} to={navPath(n.id)} className={({ isActive }) => 'dash-link' + (isActive ? ' active' : '')} title={collapsed ? n.label : undefined}>
                    {Icon && <Icon size={20} aria-hidden="true" />}<span className="dash-label">{n.label}</span>
                  </NavLink>) })}
              </div>
            )
          })}
        </nav>
        <button type="button" className="dash-collapse" onClick={toggleCollapse} aria-pressed={collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <><ChevronLeft size={18} aria-hidden="true" /><span className="dash-label">Collapse</span></>}
        </button>
      </aside>
      {open && <div className="dash-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="dash-body">
        <header className="dash-top">
          <button type="button" className="dash-iconbtn dash-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="dash-side" onClick={() => setOpen((o) => !o)}>{open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
          <h1 className="dash-title">{current ? current.label : 'Dashboard'}</h1>
          <div className="dash-user">
            <div className="dash-who"><span className="dash-mail">{email}</span><span className="dash-roles">{roleLabels(ctx).join(' · ')}</span></div>
            <button type="button" className="dash-btn ghost" onClick={signOut}><LogOut size={16} aria-hidden="true" /> <span>Sign out</span></button>
          </div>
        </header>
        <main id="dash-main" className="dash-main" tabIndex={-1}><Outlet /></main>
        <footer className="dash-foot">ASARTUN TECH BUILDER · a product of ASARTUN STORE LIMITED</footer>
      </div>
    </div>
  )
}
