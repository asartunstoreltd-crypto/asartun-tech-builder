import { useCallback, useEffect, useState } from 'react'
import { Bi, Field } from './ui.jsx'
import { blank } from './api.js'
import { deleteLevel, listLevels, listMissionMeta, saveLevel, saveMissionMeta } from './api2.js'

const RISK = { low: 'Low', medium: 'Medium', high: 'High ⚠️' }
const nm = (o) => (o && (o.en || o.ha)) || ''

// Admin → Levels & safety: age groups for lessons, and how risky each lesson's real activity is.
export default function Levels() {
  const [levels, setLevels] = useState(null)
  const [missions, setMissions] = useState(null)
  const [msg, setMsg] = useState(null)
  const load = useCallback(async () => {
    try { const [l, m] = await Promise.all([listLevels(), listMissionMeta()]); setLevels(l); setMissions(m) } catch (e) { setMsg({ err: e.message }) }
  }, [])
  useEffect(() => { load() }, [load])
  if (!levels || !missions) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const run = (fn, ok) => async () => { setMsg(null); try { await fn(); await load(); setMsg({ ok }) } catch (e) { setMsg({ err: e.message }) } }
  const editL = (i, p) => setLevels(levels.map((x, n) => (n === i ? { ...x, ...p } : x)))
  const editM = (slug, p) => setMissions(missions.map((x) => (x.slug === slug ? { ...x, ...p } : x)))
  return (
    <>
      <h2>Levels &amp; safety</h2>
      <p className="adm-note">Every lesson has a <b>level</b> (age group) and a <b>risk level</b>. A child can open only lessons whose level starts at or below their age band. <b>High-risk</b> lessons need a known age. A child without an age counts as 8–10. Ages are told by the parent or child; inside a school or company only the organization can change them.</p>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}

      <h3>Levels</h3>
      {levels.map((l, i) => (
        <div className="adm-card" key={l.id || 'new' + i}>
          <Bi label="Level name" value={l.name} onChange={(v) => editL(i, { name: v })} />
          <div className="adm-two">
            <Field label="Code (letters, numbers, dash)"><input value={l.slug} onChange={(e) => editL(i, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
            <Field label="Youngest age"><input type="number" min="3" max="18" value={l.min_age} onChange={(e) => editL(i, { min_age: e.target.value })} /></Field>
            <Field label="Oldest age"><input type="number" min="3" max="18" value={l.max_age} onChange={(e) => editL(i, { max_age: e.target.value })} /></Field>
            <Field label="Order"><input type="number" value={l.position} onChange={(e) => editL(i, { position: e.target.value })} /></Field>
          </div>
          <div className="adm-actions">
            <button className="adm-btn" disabled={!l.slug} onClick={run(() => saveLevel(l), 'Level saved.')}>Save level</button>
            {l.id && <button className="adm-btn danger" onClick={() => { if (window.confirm('Delete this level? Its lessons become “no level”.')) run(() => deleteLevel(l.id), 'Level deleted.')() }}>Delete</button>}
          </div>
        </div>))}
      <button className="adm-btn ghost" onClick={() => setLevels([...levels, { name: blank(), slug: '', min_age: 5, max_age: 17, position: levels.length + 1 }])}>+ Add level</button>

      <h3>Lessons: level and risk</h3>
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr><th>Mission</th><th>Status</th><th>Level</th><th>Risk</th></tr></thead>
        <tbody>{missions.map((m) => (
          <tr key={m.slug}>
            <td>{m.mission_no ? m.mission_no + '. ' : ''}{nm(m.title) || m.slug}</td><td>{m.status}</td>
            <td><select value={m.level_id || ''} onChange={(e) => editM(m.slug, { level_id: e.target.value || null })}>
              <option value="">(none)</option>{levels.filter((l) => l.id).map((l) => <option key={l.id} value={l.id}>{nm(l.name)}</option>)}</select></td>
            <td><select value={m.risk_level} onChange={(e) => editM(m.slug, { risk_level: e.target.value })}>{Object.entries(RISK).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></td>
          </tr>))}</tbody>
      </table></div>
      <div className="adm-actions"><button className="adm-btn" onClick={run(() => saveMissionMeta(missions), 'Lessons saved.')}>Save lessons</button></div>
    </>
  )
}
