import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import { LangProvider } from './lib/i18n.jsx'
import './styles/app.css'
import './pwa/pwa.css'
import UpdatePrompt from './pwa/UpdatePrompt.jsx'
import { registerServiceWorker } from './pwa/register.js'
import './pwa/install.js'
import { legacyAdminTarget } from './dashboard/legacy.js'

// The admin panel is code-split: learners never download it.
const DashboardApp = lazy(() => import('./dashboard/DashboardApp.jsx'))   // ONE dashboard for admin + adult staff (replaces /admin and /adult/teach screens)
const OrgApp = lazy(() => import('./org/OrgApp.jsx'))
const AdultApp = lazy(() => import('./adult/AdultApp.jsx'))   // ASARTUN ADULT LEARNING (separate module)

// /admin/* keeps working: every old address is sent to its place in /dashboard (deep links and ?query kept). Nothing under /dashboard redirects back, so no loops.
function LegacyAdmin() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={legacyAdminTarget(pathname, search, hash)} replace />
}

registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/dashboard/*" element={<Suspense fallback={null}><DashboardApp /></Suspense>} />
      <Route path="/admin/*" element={<LegacyAdmin />} />
      <Route path="/org/*" element={<Suspense fallback={null}><OrgApp /></Suspense>} />
      <Route path="/adult/*" element={<Suspense fallback={null}><AdultApp /></Suspense>} />
      <Route path="*" element={<LangProvider><App /></LangProvider>} />
    </Routes>
    <UpdatePrompt />
  </BrowserRouter>
)
