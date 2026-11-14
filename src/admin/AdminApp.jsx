import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider } from './AdminAuth.jsx'
import RequireAdmin from './RequireAdmin.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminLayout from './AdminLayout.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import MissionList from './MissionList.jsx'
import MissionEditor from './MissionEditor.jsx'
import MediaLibrary from './MediaLibrary.jsx'
import ActivityLog from './ActivityLog.jsx'
import Learners from './Learners.jsx'
import Premium from './Premium.jsx'
import StaffAccounts from './StaffAccounts.jsx'
import { OrganizationList, OrganizationDetail } from './Organizations.jsx'
import './admin.css'

// Mounted at /admin/*. Content routes are guarded again by role; the database enforces the same rules.
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route element={<RequireAdmin roles={['content_manager']} />}>
              <Route path="missions" element={<MissionList />} />
              <Route path="missions/:id" element={<MissionEditor />} />
            </Route>
            <Route element={<RequireAdmin roles={['content_manager', 'media_manager']} />}>
              <Route path="media" element={<MediaLibrary />} />
            </Route>
            <Route element={<RequireAdmin roles={['learning_analyst']} />}>
              <Route path="learners" element={<Learners />} />
            </Route>
            <Route element={<RequireAdmin roles={['super_admin']} />}>
              <Route path="organizations" element={<OrganizationList />} />
              <Route path="organizations/:id" element={<OrganizationDetail />} />
              <Route path="staff" element={<StaffAccounts />} />
              <Route path="premium" element={<Premium />} />
              <Route path="activity" element={<ActivityLog />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminAuthProvider>
  )
}
