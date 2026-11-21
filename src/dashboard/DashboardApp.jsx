import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminAuthProvider } from '../admin/AdminAuth.jsx'
import { AdultProvider } from '../adult/AdultAuth.jsx'
import '../admin/admin.css'
import '../adult/adult.css'
import './dashboard.css'
import { DashAuthProvider, useDash } from './DashAuth.jsx'
import { ToastProvider } from './Toast.jsx'
import Guard from './Guard.jsx'
import Login from './Login.jsx'
import Shell from './Shell.jsx'
import { AdminEmbed } from './Embeds.jsx'
import Overview from './pages/Overview.jsx'
import Settings from './pages/Settings.jsx'

// Mounted at /dashboard/*. ONE layout for everybody; each section is guarded by role here AND by the database (RLS + checks inside every function).
const StaffPage = lazy(() => import('./pages/StaffPage.jsx'))
const adult = (name) => lazy(() => import('./pages/AdultSections.jsx').then((m) => ({ default: m[name] })))
const Learners = adult('LearnersSection'), Classes = adult('ClassesSection'), Assignments = adult('AssignmentsSection'), Attendance = adult('AttendanceSection')
const Reports = adult('ReportsSection'), Certificates = adult('CertificatesSection'), Courses = adult('CoursesSection'), Content = adult('ContentSection'), Payments = adult('PaymentsSection')
const ChildrenOverview = lazy(() => import('../admin/AdminDashboard.jsx')), MissionList = lazy(() => import('../admin/MissionList.jsx')), MissionEditor = lazy(() => import('../admin/MissionEditor.jsx'))
const Levels = lazy(() => import('../admin/Levels.jsx')), Media = lazy(() => import('../admin/MediaLibrary.jsx')), ChildLearners = lazy(() => import('../admin/Learners.jsx'))
const OrgList = lazy(() => import('../admin/Organizations.jsx').then((m) => ({ default: m.OrganizationList }))), OrgDetail = lazy(() => import('../admin/Organizations.jsx').then((m) => ({ default: m.OrganizationDetail })))
const SchoolStaff = lazy(() => import('../admin/StaffAccounts.jsx')), Premium = lazy(() => import('../admin/Premium.jsx')), ActivityLog = lazy(() => import('../admin/ActivityLog.jsx'))

const A = ({ children }) => <AdminEmbed>{children}</AdminEmbed>
const G = ({ id, children }) => <Guard id={id}>{children}</Guard>

function Gate() {
  const { ready, session, ctx, signOut } = useDash()
  if (!ready) return <div className="dash-center"><p className="dash-muted" role="status">Loading…</p></div>
  if (!session) return <Login />
  if (!ctx.hasAnyRole) return (
    <div className="dash-center"><div className="dash-card" role="alert"><h2>No access</h2><p>This account has no staff role. Ask an administrator to grant one.</p><button type="button" className="dash-btn" onClick={signOut}>Sign out</button></div></div>
  )
  return (
    <Suspense fallback={<div className="dash-center"><p className="dash-muted" role="status">Loading…</p></div>}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<G id="overview"><Overview /></G>} />
          <Route path="staff" element={<G id="staff"><StaffPage /></G>} />
          <Route path="learners" element={<G id="learners"><Learners /></G>} />
          <Route path="classes" element={<G id="classes"><Classes /></G>} />
          <Route path="courses" element={<G id="courses"><Courses /></G>} />
          <Route path="content" element={<G id="content"><Content /></G>} />
          <Route path="assignments" element={<G id="assignments"><Assignments /></G>} />
          <Route path="attendance" element={<G id="attendance"><Attendance /></G>} />
          <Route path="reports" element={<G id="reports"><Reports /></G>} />
          <Route path="certificates" element={<G id="certificates"><Certificates /></G>} />
          <Route path="payments" element={<G id="payments"><Payments /></G>} />
          <Route path="children" element={<G id="children"><A><ChildrenOverview /></A></G>} />
          <Route path="missions" element={<G id="missions"><A><MissionList /></A></G>} />
          <Route path="missions/:id" element={<G id="missions"><A><MissionEditor /></A></G>} />
          <Route path="levels" element={<G id="levels"><A><Levels /></A></G>} />
          <Route path="media" element={<G id="media"><A><Media /></A></G>} />
          <Route path="child-learners" element={<G id="child-learners"><A><ChildLearners /></A></G>} />
          <Route path="organizations" element={<G id="organizations"><A><OrgList /></A></G>} />
          <Route path="organizations/:id" element={<G id="organizations"><A><OrgDetail /></A></G>} />
          <Route path="school-staff" element={<G id="school-staff"><A><SchoolStaff /></A></G>} />
          <Route path="premium" element={<G id="premium"><A><Premium /></A></G>} />
          <Route path="activity" element={<G id="activity"><A><ActivityLog /></A></G>} />
          <Route path="settings" element={<G id="settings"><Settings /></G>} />
          <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function DashboardApp() {
  return (
    <AdminAuthProvider>
      <AdultProvider>
        <DashAuthProvider>
          <ToastProvider><Gate /></ToastProvider>
        </DashAuthProvider>
      </AdultProvider>
    </AdminAuthProvider>
  )
}
