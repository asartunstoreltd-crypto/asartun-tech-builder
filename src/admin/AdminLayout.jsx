import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAuth } from './AdminAuth.jsx'

const roleLabel = { super_admin: 'Super Admin', content_manager: 'Content Manager', learning_analyst: 'Learning Analyst', media_manager: 'Media Manager' }

export default function AdminLayout() {
  const { session, roles, signOut, hasRole } = useAdminAuth()
  return (
    <div className="adm">
      <header className="adm-top">
        <div><b>🛠️ ASARTUN TECH BUILDER</b> <span className="adm-sub">Admin</span></div>
        <div className="adm-user">
          <span className="adm-roles">{roles.map((r) => roleLabel[r] ?? r).join(' · ')}</span>
          <span className="adm-mail">{session?.user?.email}</span>
          <button className="adm-btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <nav className="adm-nav">
        <NavLink to="/admin/dashboard">Dashboard</NavLink>
        {hasRole('content_manager') && <NavLink to="/admin/missions">Missions</NavLink>}
        {hasRole('content_manager', 'media_manager') && <NavLink to="/admin/media">Media Library</NavLink>}
        {hasRole('learning_analyst') && <NavLink to="/admin/learners">Learners</NavLink>}
        {hasRole('super_admin') && <NavLink to="/admin/organizations">Schools &amp; companies</NavLink>}
        {hasRole('super_admin') && <NavLink to="/admin/premium">Premium</NavLink>}
        {hasRole('super_admin') && <NavLink to="/admin/activity">Activity log</NavLink>}
      </nav>
      <main className="adm-main"><Outlet /></main>
      <footer className="adm-foot">ASARTUN TECH BUILDER · a product of ASARTUN STORE LIMITED</footer>
    </div>
  )
}
