import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdult } from '../AdultAuth.jsx'
import { learnerApi } from '../adultApi.js'

// Certificate of course COMPLETION (Phase 8C). It says what it is: an ASARTUN course completion certificate.
// It never says or suggests government accreditation, and there is no public check page: only the owner and staff can open it.
const ERR = { network: 'errNetwork', denied: 'errDenied', NOTYET: 'errNotYet', WITHDRAWN: 'errWithdrawn', NOCOURSE: 'errNoCourse' }
const fmt = (v) => (v ? new Date(v).toLocaleDateString() : '')

export function CertificateCard({ cert }) {
  const { t, lang } = useAdult()
  const title = cert.course_title ? (cert.course_title[lang] || cert.course_title.en) : ''
  return (
    <article className="ad-cert ad-print-area" aria-label={t('certHeading')}>
      <p><strong>ASARTUN ADULT LEARNING</strong></p>
      <h1>{t('certHeading')}</h1>
      <p>{t('certCertify')}</p>
      <p className="ad-cert-name">{cert.learner_name}</p>
      <p>{t('certCompleted')}</p>
      <p><strong>{title}</strong></p>
      <p>{t('certBy')}</p>
      <p>{t('certNumber', { n: cert.number })} · {t('certDate', { date: fmt(cert.issued_at) })}</p>
      {cert.status === 'revoked' && <p className="ad-error"><strong>{t('certWithdrawn')}</strong></p>}
      <p className="ad-cert-fine">{t('certNotAccredited')}</p>
    </article>
  )
}

export function CertificatePage() {
  const { id } = useParams(); const { t } = useAdult()
  const [rows, setRows] = useState(null)
  useEffect(() => { learnerApi.myCertificates().then(({ data }) => setRows(data || [])) }, [])
  if (!rows) return <main className="ad-page ad-center"><p className="ad-big">{t('wait')}</p></main>
  const cert = rows.find((x) => x.id === id)
  return (
    <main className="ad-page">
      {cert ? <CertificateCard cert={cert} /> : <p className="ad-note">{t('certNone')}</p>}
      {cert && <button className="ad-btn primary ad-noprint" onClick={() => window.print()}>{t('certPrint')}</button>}
      <Link className="ad-link ad-noprint" to="/adult/progress">{t('back')}</Link>
    </main>
  )
}

// Shown under the lesson list of a course: how far the learner is, and the button once the database says they are eligible.
export function CertificateBox({ course }) {
  const { t } = useAdult()
  const [s, setS] = useState(null); const [e, setE] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => learnerApi.certificateStatus(course.id).then(({ data }) => setS(data || null))
  useEffect(() => { load() }, [course.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !s.required) return null
  const claim = async () => { setBusy(true); setE(''); const { error } = await learnerApi.claimCertificate(course.id); setBusy(false); if (error) setE(t(ERR[error] || 'errGeneric')); else load() }
  const pct = s.checks ? Math.round((s.right / s.checks) * 100) : 100
  return (
    <section className="ad-card">
      <h2>{t('certMine')}</h2>
      {s.certificate ? (
        <Link className="ad-btn primary" to={'/adult/certificate/' + s.certificate.id}>{t('certView')}</Link>
      ) : (
        <>
          <p>{t('certNotYet', { done: s.completed, required: s.required })}</p>
          {s.completed >= s.required && !s.eligible && <p className="ad-note">{t('certNeedAccuracy', { pct })}</p>}
          {s.eligible && <><p className="ad-ok">{t('certReady')}</p><button className="ad-btn primary" disabled={busy} onClick={claim}>{t('certClaim')}</button></>}
          <p className="ad-note">{t('certRule')}</p>
        </>)}
      {e && <p className="ad-error" role="alert">{e}</p>}
    </section>
  )
}
