import { Navigate, Route, Routes } from 'react-router-dom'
import { AdultProvider } from './AdultAuth.jsx'
import { Landing, Login, Register } from './pages/Public.jsx'
import { AssessmentPage, Courses, Help, Home, Practice, Shell } from './pages/Learner.jsx'
import { CourseBySlug, LessonList, LessonPlayer } from './pages/Lessons.jsx'
import { WorkDetail, WorkList } from './pages/Work.jsx'
import Progress from './pages/Progress.jsx'
import { CertificatePage } from './pages/Certificate.jsx'
import { PaymentHistory } from './pages/Pay.jsx'
import { lazy, Suspense } from 'react'
import './adult.css'

// Facilitator area is split out so learners never download it.
const Teach = lazy(() => import('./pages/Teach.jsx'))

export default function AdultApp() {
  return (
    <AdultProvider>
      <div className="adult">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route element={<Shell />}>
            <Route path="home" element={<Home />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="courses" element={<Courses />} />
            <Route path="learn" element={<LessonList slug="basic-literacy" />} />
            <Route path="numeracy" element={<LessonList slug="basic-numeracy" />} />
            <Route path="digital" element={<LessonList slug="basic-digital" />} />
            <Route path="c/:slug" element={<CourseBySlug />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="certificate/:id" element={<CertificatePage />} />
            <Route path="learn/:key" element={<LessonPlayer />} />
            <Route path="write" element={<WorkList />} />
            <Route path="work/:id" element={<WorkDetail />} />
            <Route path="progress" element={<Progress />} />
            <Route path="practice" element={<Practice />} />
            <Route path="help" element={<Help />} />
          </Route>
          <Route path="teach/*" element={<Suspense fallback={null}><Teach /></Suspense>} />
          <Route path="*" element={<Navigate to="/adult" replace />} />
        </Routes>
      </div>
    </AdultProvider>
  )
}
