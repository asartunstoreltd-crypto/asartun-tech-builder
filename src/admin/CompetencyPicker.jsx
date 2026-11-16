import { useEffect, useState } from 'react'
import { listCompetencies, missionCompetencies, setMissionCompetencies } from './api2.js'

// Content managers tag a lesson with the skills it builds. Saved on its own (needs the lesson to be saved once first).
// Hidden if migration 015 has not been run.
export default function CompetencyPicker({ missionId }) {
  const [all, setAll] = useState(null)
  const [on, setOn] = useState([])
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!missionId) return
    Promise.all([listCompetencies(), missionCompetencies(missionId)]).then(([c, m]) => { setAll(c); setOn(m) }).catch(() => setAll(null))
  }, [missionId])
  if (!missionId || !all) return null
  const toggle = (slug) => setOn((x) => (x.includes(slug) ? x.filter((y) => y !== slug) : [...x, slug]))
  const save = async () => { try { await setMissionCompetencies(missionId, on); setMsg('Saved.') } catch (e) { setMsg(e.message) } }
  return (
    <div className="adm-card">
      <h3>Skills this lesson builds</h3>
      <p className="adm-note">Teachers see these in the skills overview. Tick only the skills the activities really practise.</p>
      <div className="adm-chips">{all.map((c) => (
        <label key={c.slug} className="adm-chk"><input type="checkbox" checked={on.includes(c.slug)} onChange={() => toggle(c.slug)} /> {(c.name && (c.name.en || c.name.ha)) || c.slug}</label>
      ))}</div>
      <button type="button" className="adm-btn" onClick={save}>Save skills</button> {msg && <span className="adm-note">{msg}</span>}
    </div>
  )
}
