import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { LangProvider } from './lib/i18n.jsx'
import './styles/app.css'

// The admin panel is code-split: learners never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const OrgApp = lazy(() => import('./org/OrgApp.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
      <Route path="/org/*" element={<Suspense fallback={null}><OrgApp /></Suspense>} />
      <Route path="*" element={<LangProvider><App /></LangProvider>} />
    </Routes>
  </BrowserRouter>
)
