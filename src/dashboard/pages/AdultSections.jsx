import { useEffect } from 'react'
import { loadContent } from '../../adult/contentLoader.js'
import { Classes, Learners } from '../../adult/pages/Teach.jsx'
import WorkTab from '../../adult/pages/TeachWork.jsx'
import { AttendanceTab, ReportsTab } from '../../adult/pages/TeachReports.jsx'
import { CertificatesTab, CoursesTab, PaymentsTab } from '../../adult/pages/TeachAdmin.jsx'
import ContentTab from '../../adult/pages/TeachContent.jsx'
import { useDash } from '../DashAuth.jsx'
import { AdultEmbed } from '../Embeds.jsx'

// The existing adult-learning tabs, mounted as dashboard sections. They keep their own permission checks (database functions + RLS).
function Wrap({ children }) {
  useEffect(() => { loadContent('staff') }, [])             // the admin's text corrections, recordings and courses (also needed for names in reports)
  return <AdultEmbed>{children}</AdultEmbed>
}
export const LearnersSection = () => { const { ctx } = useDash(); return <Wrap><Learners role={ctx.adultRole} /></Wrap> }
export const ClassesSection = () => { const { ctx } = useDash(); return <Wrap><Classes role={ctx.adultRole} /></Wrap> }
export const AssignmentsSection = () => <Wrap><WorkTab /></Wrap>
export const AttendanceSection = () => <Wrap><AttendanceTab /></Wrap>
export const ReportsSection = () => { const { ctx } = useDash(); return <Wrap><ReportsTab role={ctx.adultRole} /></Wrap> }
export const CertificatesSection = () => { const { ctx } = useDash(); return <Wrap><CertificatesTab role={ctx.adultRole} /></Wrap> }
export const CoursesSection = () => <Wrap><CoursesTab /></Wrap>
export const ContentSection = () => <Wrap><ContentTab /></Wrap>
export const PaymentsSection = () => <Wrap><PaymentsTab /></Wrap>
