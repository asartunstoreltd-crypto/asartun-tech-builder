import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from './AdminAuth.jsx'

// Route guard. Shows nothing admin-related unless the database confirmed an admin role.
export default function RequireAdmin({ roles }) {
  const { session, status, isAdmin, hasRole, signOut } = useAdminAuth()
  if (status === 'loading' || (session && status !== 'ready')) return <div className="adm-center"><p>Loading…</p></div>
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isAdmin || (roles && !hasRole(...roles))) return (
    <div className="adm-center">
      <div className="adm-card">
        <h2>No access</h2>
        <p>This account is not authorised for the admin panel.</p>
        <button className="adm-btn" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
  return <Outlet />
}
