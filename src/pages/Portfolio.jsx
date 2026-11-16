import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { loadMyPortfolio, localEntries, flushPortfolio } from '../lib/portfolio.js'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import EntryView from '../components/EntryView.jsx'

// The child's own projects and teacher feedback. Shows what is saved on the database if online, else what is saved on this device.
export default function Portfolio({ onBack }) {
  const { t, L } = useLang()
  const [data, setData] = useState(null)
  const [skills, setSkills] = useState({})
  const [fromServer, setFromServer] = useState(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      await flushPortfolio().catch(() => {})
      const srv = await loadMyPortfolio().catch(() => null)
      if (isSupabaseConfigured) {
        const { data: cs } = await supabase.from('competencies').select('slug,name')
        if (alive && cs) setSkills(Object.fromEntries(cs.map((c) => [c.slug, c.name])))
      }
      if (!alive) return
      if (srv) { setData(srv); setFromServer(true) } else {
        setData({ entries: localEntries().map((e) => ({ id: e.mission + ':' + e.key, mission_title: { ha: e.mission, en: e.mission }, kind: e.kind, content: e.content, updated_at: e.updated_at })), assessments: [] })
      }
    })()
    return () => { alive = false }
  }, [])
  return (
    <div className="page">
      <button className="btn ghost" onClick={onBack}>{t('back')}</button>
      <h2>{t('portfolioTitle')}</h2>
      {data && !fromServer && <p className="small">{t('portfolioLocal')}</p>}
      {!data && <p className="small">⏳</p>}
      {data && data.assessments.length > 0 && (
        <div className="card"><h3>{t('teacherFeedback')}</h3>
          {data.assessments.map((a) => (
            <p key={a.id}><b>{skills[a.competency] ? L(skills[a.competency]) : a.competency}</b>: {'★'.repeat(a.score)}{'☆'.repeat(4 - a.score)} — {t('sc' + a.score)}{a.comment ? <><br />“{a.comment}”</> : null}</p>
          ))}
        </div>
      )}
      {data && data.entries.length === 0 && <p className="card">{t('portfolioEmpty')}</p>}
      {data && data.entries.map((e) => (
        <div className="card" key={e.id}>
          <p className="small">{L(e.mission_title)} · {new Date(e.updated_at).toLocaleDateString()}</p>
          <EntryView e={e} pick={L} />
        </div>
      ))}
    </div>
  )
}
