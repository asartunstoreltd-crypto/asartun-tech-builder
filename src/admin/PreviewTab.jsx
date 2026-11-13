import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabase.js'
import { buildMission, collectPaths, signPaths } from '../lib/missionStore.js'
import { LangProvider } from '../lib/i18n.jsx'
import LangSwitcher from '../components/LangSwitcher.jsx'
import MissionEngine from '../components/MissionEngine.jsx'
import { missionPatch } from './api.js'

// The real learner MissionEngine, fed with the editor's CURRENT (even unsaved) content.
function Run({ mission }) {
  const [s, setS] = useState({ nick: 'Preview', points: 0, badges: [], earned: [] })
  const award = (key, pts, badge) => setS((p) => (p.earned.includes(key) ? p : {
    ...p, points: p.points + (Number(pts) || 0), earned: [...p.earned, key],
    badges: badge && !p.badges.includes(badge) ? [...p.badges, badge] : p.badges }))
  return (<><LangSwitcher /><MissionEngine mission={mission} state={s} award={award} onExit={() => window.scrollTo(0, 0)} /></>)
}

export default function PreviewTab({ st, rows }) {
  const [mission, setMission] = useState(null)
  const [broken, setBroken] = useState([])
  const [run, setRun] = useState(0)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    let live = true
    ;(async () => {
      const patch = missionPatch(st)
      const paths = collectPaths([rows.steps.map((s) => s.content), rows.questions.map((q) => q.media)])
      const { map, broken: b } = await signPaths(supabaseAdmin, paths)
      const m = buildMission(
        { slug: st.m.slug, mission_no: st.m.mission_no, title: st.m.title, engine_options: patch.engine_options, stages: patch.stages, reward_rules: patch.reward_rules },
        rows.steps, rows.questions, map)
      if (live) { setMission(m); setBroken(b) }
    })()
    return () => { live = false }
  }, [st, rows])
  if (!mission) return <p>Building preview…</p>
  return (
    <div>
      <div className="adm-card">
        <p>This is exactly what a child will see. Try every step, switch HAUSA / ENGLISH, and listen to the audio. Nothing you do here is saved.</p>
        <div className="adm-actions">
          <button className="adm-btn ghost" onClick={() => setRun(run + 1)}>↺ Restart preview</button>
          <button className="adm-btn ghost" onClick={() => setWide(!wide)}>{wide ? '📱 Phone size' : '🖥️ Computer size'}</button>
        </div>
        {broken.length > 0 && <p className="adm-err">Media that could not be loaded: {broken.join(', ')}</p>}
      </div>
      <div className={'adm-preview' + (wide ? ' wide' : '')}>
        <LangProvider><Run key={run} mission={mission} /></LangProvider>
      </div>
    </div>
  )
}
