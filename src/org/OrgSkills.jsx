import { useEffect, useState } from 'react'
import EntryView from '../components/EntryView.jsx'
import { listCompetencies, orgAssess, orgCompetencyReport, orgDeleteAssessment, orgLearnerPortfolio } from '../admin/api2.js'

// School portal: skills overview for the class + each learner's project portfolio + simple 1-4 teacher assessment.
// The database decides who may see or assess whom; this screen only calls it.
const en = (o) => (o && (o.en || o.ha)) || ''
const SCALE = ['Needs a lot of help', 'Can do it with some help', 'Can do it alone', 'Can do it alone and explain or improve it']

export default function OrgSkills({ orgId }) {
  const [skills, setSkills] = useState([])
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)       // { id, name, data }
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ competency: '', score: 3, comment: '', entry: '' })
  const [busy, setBusy] = useState(false)

  const loadReport = () => orgCompetencyReport(orgId).then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { listCompetencies().then((c) => { setSkills(c); setForm((f) => ({ ...f, competency: c[0] ? c[0].slug : '' })) }).catch((e) => setErr(e.message)); loadReport() }, [orgId]) // eslint-disable-line
  const show = async (r) => {
    setErr('')
    try { setOpen({ id: r.id, name: r.student_ref || r.nickname, data: await orgLearnerPortfolio(orgId, r.id) }) } catch (e) { setErr(e.message) }
  }
  const refresh = async () => { setOpen({ ...open, data: await orgLearnerPortfolio(orgId, open.id) }); loadReport() }
  const submit = async (ev) => {
    ev.preventDefault(); setBusy(true); setErr('')
    try {
      await orgAssess(orgId, open.id, form.competency, Number(form.score), form.comment, null, form.entry || null)
      setForm({ ...form, comment: '', entry: '' }); await refresh()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const del = async (id) => { if (!window.confirm('Delete this assessment?')) return; try { await orgDeleteAssessment(orgId, id); await refresh() } catch (e) { setErr(e.message) } }
  const name = (slug) => en((skills.find((s) => s.slug === slug) || {}).name) || slug

  return (
    <div>
      {err && <p className="adm-err">{err}</p>}
      <div className="adm-card">
        <h3>Skills overview</h3>
        <p className="adm-note">Each box shows the teacher’s latest score (1–4) for that skill. “·n” is the number of finished lessons that build the skill. These are your assessments of practical work, not school marks, and they are not an accredited qualification.</p>
        {!rows && <p>Loading…</p>}
        {rows && rows.length === 0 && <p className="adm-empty">No learners have joined yet.</p>}
        {rows && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Learner</th>{skills.map((s) => <th key={s.slug}>{en(s.name)}</th>)}<th>Projects</th><th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}><td>{r.student_ref || r.nickname}</td>
                  {skills.map((s) => <td key={s.slug}>{r.latest[s.slug] ? '★'.repeat(r.latest[s.slug]) : '–'}{r.completed[s.slug] ? ` ·${r.completed[s.slug]}` : ''}</td>)}
                  <td>{r.entries}</td><td><button className="adm-btn ghost" onClick={() => show(r)}>Open</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="adm-card">
          <h3>{open.name} — projects and assessment <button className="adm-btn ghost" onClick={() => setOpen(null)}>Close</button></h3>
          <h4>Assess a skill</h4>
          <form onSubmit={submit}>
            <label className="adm-f"><span>Skill</span>
              <select value={form.competency} onChange={(e) => setForm({ ...form, competency: e.target.value })}>{skills.map((s) => <option key={s.slug} value={s.slug}>{en(s.name)}</option>)}</select></label>
            <div className="adm-f"><span>Score</span>
              {SCALE.map((d, i) => <label key={i} className="adm-chk"><input type="radio" checked={Number(form.score) === i + 1} onChange={() => setForm({ ...form, score: i + 1 })} /> {i + 1} — {d}</label>)}</div>
            <label className="adm-f"><span>About which project? (optional)</span>
              <select value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })}>
                <option value="">(general)</option>{open.data.entries.map((e) => <option key={e.id} value={e.id}>{en(e.mission_title)} · {e.kind}</option>)}</select></label>
            <label className="adm-f"><span>Short comment (the child can read this, max 500 letters)</span>
              <textarea rows={2} maxLength={500} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} style={{ width: '100%' }} /></label>
            <button className="adm-btn" disabled={busy || !form.competency}>Save assessment</button>
          </form>
          <h4>Assessments</h4>
          {open.data.assessments.length === 0 && <p className="adm-empty">None yet.</p>}
          {open.data.assessments.map((a) => (
            <p key={a.id}><b>{name(a.competency)}</b> {'★'.repeat(a.score)}{'☆'.repeat(4 - a.score)} {a.comment ? `— ${a.comment}` : ''} <span className="adm-note">{new Date(a.created_at).toLocaleDateString()}</span> <button className="adm-btn ghost" onClick={() => del(a.id)}>Delete</button></p>
          ))}
          <h4>Projects</h4>
          {open.data.entries.length === 0 && <p className="adm-empty">This learner has not saved any project yet.</p>}
          {open.data.entries.map((e) => <div className="adm-sub" key={e.id}><p className="adm-note">{en(e.mission_title)} · {e.kind} · {new Date(e.updated_at).toLocaleDateString()}</p><EntryView e={e} pick={en} /></div>)}
        </div>
      )}
    </div>
  )
}
