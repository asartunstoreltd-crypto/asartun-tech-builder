import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider } from './AdminAuth.jsx'
import RequireAdmin from './RequireAdmin.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminLayout from './AdminLayout.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import './admin.css'

// Mounted at /admin/*. Phase 2+ modules (missions, lessons, media, learners, rewards, roles, settings)
// are added as more routes inside the guarded layout below.
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminAuthProvider>
  )
}
