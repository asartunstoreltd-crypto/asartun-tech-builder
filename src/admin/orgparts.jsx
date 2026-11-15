import { useCallback, useEffect, useState } from 'react'
import { Confirm, Field } from './ui.jsx'
import ResultsView from './ResultsView.jsx'
import InsightsView from './InsightsView.jsx'
import { addClass, ago, deleteClass, downloadCsv, listClasses, orgCurriculum, orgLearnerResults, orgLearners, orgReport, setLearnerAge, setOrgCurriculum, setStudentRef } from './api2.js'

// Shared by the ASARTUN admin (Organizations page) and the school/company portal (/org).
export function OrgLearners({ orgId, orgName }) {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => orgLearners(orgId).then(setRows).catch((e) => setErr(e.message)), [orgId])
  useEffect(() => { setRows(null); load() }, [load])
  const show = async (id) => { try { setOpen(await orgLearnerResults(orgId, id)) } catch (e) { setErr(e.message) } }
  const rename = async (r) => {
    const ref = window.prompt('Your own student reference (e.g. class number). No real names are needed.', r.student_ref || '')
    if (ref === null) return
    try { await setStudentRef(orgId, r.id, ref); load() } catch (e) { setErr(e.message) }
  }
  const setAge = async (r) => {
    const b = window.prompt('Age band for this learner. Type one of: 5-7, 8-10, 11-13, 14-17', r.age_band || '')
    if (b === null) return
    try { await setLearnerAge(orgId, r.id, b.trim()); load() } catch (e) { setErr(e.message) }
  }
  const csv = () => downloadCsv(`${orgName || 'learners'}.csv`, [['Student ref', 'Nickname', 'Class', 'Age band', 'Points', 'Missions completed', 'Last active'],
    ...(rows || []).map((r) => [r.student_ref, r.nickname, r.class_name, r.age_band, r.points, r.missions_completed, r.last_active_at])])
  if (err) return <p className="adm-err">{err}</p>
  if (!rows) return <p>Loading…</p>
  return (
    <>
      <div className="adm-actions"><button className="adm-btn ghost" onClick={csv}>Download CSV</button><span className="adm-note">{rows.length} learner(s)</span></div>
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr><th></th><th>Student ref</th><th>Nickname</th><th>Class</th><th>Age</th><th>Points</th><th>Missions done</th><th>Last active</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td>{r.online ? '🟢' : ''}</td><td>{r.student_ref || '–'}</td><td><b>{r.nickname}</b></td><td>{r.class_name || '–'}</td><td>{r.age_band || '–'}</td><td>{r.points}</td>
            <td>{r.missions_completed}</td><td>{ago(r.last_active_at)}</td>
            <td className="adm-cellbtns"><button className="adm-btn ghost" onClick={() => show(r.id)}>Results</button><button className="adm-btn ghost" onClick={() => rename(r)}>Set ref</button><button className="adm-btn ghost" onClick={() => setAge(r)}>Set age</button></td>
          </tr>))}</tbody>
      </table></div>
      {rows.length === 0 && <p className="adm-empty">No learners have joined yet. Give children the class code.</p>}
      {open && <Confirm title="Learner results" yesText="Close" danger={false} onYes={() => setOpen(null)} onNo={() => setOpen(null)}><ResultsView data={open} /></Confirm>}
    </>
  )
}

export function OrgClasses({ orgId, canEdit }) {
  const [rows, setRows] = useState(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(() => listClasses(orgId).then(setRows).catch((e) => setErr(e.message)), [orgId])
  useEffect(() => { load() }, [load])
  const add = async () => { try { await addClass(orgId, name.trim()); setName(''); load() } catch (e) { setErr(e.message) } }
  const del = async (c) => { if (window.confirm(`Delete class “${c.name}”? Learners stay in the organization.`)) { try { await deleteClass(c.id); load() } catch (e) { setErr(e.message) } } }
  return (
    <>
      <p className="adm-note">Children type a class code in the app (Settings or first screen). Each class has its own code.</p>
      {err && <p className="adm-err">{err}</p>}
      {rows && rows.map((c) => (
        <div className="adm-card" key={c.id}><b>{c.name}</b> — code: <code className="adm-code">{c.join_code}</code>
          {canEdit && <button className="adm-btn ghost" onClick={() => del(c)}>Delete</button>}</div>))}
      {rows && rows.length === 0 && <p className="adm-empty">No classes yet.</p>}
      {canEdit && <div className="adm-actions"><Field label="New class name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JSS 1A" /></Field>
        <button className="adm-btn" disabled={!name.trim()} onClick={add}>+ Add class</button></div>}
    </>
  )
}

export function OrgInsights({ orgId }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { orgReport(orgId).then(setD).catch((e) => setErr(e.message)) }, [orgId])
  if (err) return <p className="adm-err">{err}</p>
  return d ? <InsightsView data={d} /> : <p>Loading…</p>
}

// The school / company chooses which lessons ITS learners see. Nothing ticked = all lessons their age allows.
export function OrgLessons({ orgId, canEdit }) {
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(new Set())
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => orgCurriculum(orgId).then((r) => { setRows(r); setSel(new Set(r.filter((x) => x.selected).map((x) => x.slug))) }).catch((e) => setMsg({ err: e.message })), [orgId])
  useEffect(() => { setRows(null); load() }, [load])
  if (!rows) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const toggle = (slug) => setSel((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else n.add(slug); return n })
  const groups = []
  rows.forEach((r) => { const k = (r.level_name && (r.level_name.en || r.level_name.ha)) || 'No level'; let g = groups.find((x) => x.k === k); if (!g) { g = { k, items: [] }; groups.push(g) } g.items.push(r) })
  const pickGroup = (g, on) => setSel((s) => { const n = new Set(s); g.items.forEach((r) => (on ? n.add(r.slug) : n.delete(r.slug))); return n })
  const save = async () => { setMsg(null); try { const n = await setOrgCurriculum(orgId, [...sel]); await load(); setMsg({ ok: n ? `Saved. Your learners see ONLY these ${n} lessons.` : 'Saved. Your learners see ALL lessons their age allows.' }) } catch (e) { setMsg({ err: e.message }) } }
  return (
    <>
      <p className="adm-note">{sel.size ? <>Your learners currently see <b>only {sel.size}</b> lesson(s).</> : <>Your learners currently see <b>all lessons</b> their age allows.</>} Tick the lessons you want and save. Leave everything unticked to allow all. Age rules and premium still apply on top.</p>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      {groups.map((g) => (
        <div className="adm-card" key={g.k}>
          <h3>{g.k}</h3>
          {canEdit && <div className="adm-actions"><button className="adm-btn ghost" onClick={() => pickGroup(g, true)}>Tick all in this level</button><button className="adm-btn ghost" onClick={() => pickGroup(g, false)}>Untick</button></div>}
          {g.items.map((r) => (
            <label className="adm-chk" key={r.slug}>
              <input type="checkbox" disabled={!canEdit} checked={sel.has(r.slug)} onChange={() => toggle(r.slug)} />
              {r.mission_no ? r.mission_no + '. ' : ''}{(r.title && (r.title.en || r.title.ha)) || r.slug}
              <span className="adm-note"> · ages {r.min_age}+{r.risk_level !== 'low' ? ' · ⚠️ ' + r.risk_level + ' risk' : ''}{r.access === 'premium' ? ' · ⭐ premium' : ''}</span>
            </label>))}
        </div>))}
      {canEdit
        ? <div className="adm-actions"><button className="adm-btn" onClick={save}>Save lessons</button><button className="adm-btn ghost" onClick={() => setSel(new Set())}>Clear (allow all)</button></div>
        : <p className="adm-note">Only an organization admin can change this.</p>}
    </>
  )
}
