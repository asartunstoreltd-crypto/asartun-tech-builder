import { useState } from 'react'
import { SortList } from './ui.jsx'
import { PageEditor, ProcessEditor, SortEditor, BusinessInfo, QuizEditor, RewardEditor } from './blocks.jsx'
import { STEP_TYPES, typeInfo, newBlock, cloneBlock, pointsOf, rule } from './api.js'

const SECTIONS = [
  { id: 'teach', title: 'TEACH', note: 'Pages the child reads first.' },
  { id: 'procs', title: 'SHOW + PRACTICE', note: 'Each one is watched as an animation, then practised in order.' },
  { id: 'chals', title: 'CHALLENGE', note: 'Games that use what the child learned.' },
  { id: 'quiz', title: 'TEST', note: 'Questions only about what was taught. Wrong answers get an explanation and another try.' },
  { id: 'reward', title: 'REWARD', note: 'Points and badges.' },
]
const name = (o) => (o && (o.en || o.ha)) || ''

export default function LessonTab({ st, setSt, meta }) {
  const [picking, setPicking] = useState(false)
  const edit = (list, uid, p) => setSt((s) => ({ ...s, [list]: s[list].map((b) => (b.uid === uid ? { ...b, content: { ...b.content, ...p } } : b)) }))
  const setList = (list) => (items) => setSt((s) => ({ ...s, [list]: items }))
  const dup = (list) => (i) => setSt((s) => ({ ...s, [list]: [...s[list].slice(0, i + 1), cloneBlock(s[list][i]), ...s[list].slice(i + 1)] }))
  const del = (list) => (i) => { if (window.confirm('Delete this learning step? This cannot be undone after you save.')) setSt((s) => ({ ...s, [list]: s[list].filter((_, j) => j !== i) })) }
  const pick = (type) => {
    setPicking(false)
    const info = typeInfo(type)
    if (info.section === 'reward') { document.getElementById('sec-reward').scrollIntoView({ behavior: 'smooth' }); return }
    setSt((s) => ({ ...s, [info.section]: [...s[info.section], newBlock(type)] }))
    setTimeout(() => { const el = document.getElementById('sec-' + info.section); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, 50)
  }
  const stages = st.m.stages
  const toggle = (ids, on) => setSt((s) => {
    const rest = s.m.stages.filter((x) => !ids.includes(x))
    return { ...s, m: { ...s.m, stages: on ? [...rest, ...ids] : rest } }
  })
  const setRw = (rw) => setSt((s) => ({ ...s, rw }))
  const common = (list) => ({ items: st[list], setItems: setList(list), keyOf: (b) => b.uid, duplicate: dup(list), remove: del(list) })
  const count = { teach: st.teach.length, procs: st.procs.length, chals: st.chals.length, quiz: st.quiz.length, reward: 1 }

  return (
    <div>
      <div className="adm-card">
        <div className="adm-flow">
          {['TEACH', 'SHOW', 'PRACTICE', 'TEST', 'REWARD'].map((x, i) => <span key={x}>{i > 0 && <i>➜</i>}<b>{x}</b></span>)}
        </div>
        <p className="adm-note">The lesson always runs in this order: Learn → Watch → Practice → Challenge → Quiz → Prize. You choose which parts to include and arrange the steps inside each part.</p>
        <div className="adm-chips">
          <label className="adm-chk"><input type="checkbox" checked={stages.includes('teach')} onChange={(e) => toggle(['teach'], e.target.checked)} /> Learn pages</label>
          <label className="adm-chk"><input type="checkbox" checked={stages.includes('show')} onChange={(e) => toggle(['show', 'practice'], e.target.checked)} /> Watch + Practice</label>
          <label className="adm-chk"><input type="checkbox" checked={stages.includes('challenge')} onChange={(e) => toggle(['challenge'], e.target.checked)} /> Challenge</label>
          <label className="adm-chk"><input type="checkbox" checked disabled /> Quiz and Prize (always)</label>
        </div>
        <button type="button" className="adm-btn big" onClick={() => setPicking(!picking)}>+ ADD LEARNING STEP</button>
        {picking && (
          <div className="adm-types">
            {STEP_TYPES.map((t) => (
              <button type="button" key={t.type} className="adm-type" onClick={() => pick(t.type)}>
                <span>{t.emoji}</span><b>{t.name}</b><small>{t.help}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {SECTIONS.map((sec) => (
        <div className="adm-card" key={sec.id} id={'sec-' + sec.id}>
          <h3>{sec.title} <span className="adm-count">{count[sec.id]}</span></h3>
          <p className="adm-note">{sec.note}</p>
          {sec.id === 'teach' && <SortList {...common('teach')}
            title={(b) => `${typeInfo(b.type).emoji} ${typeInfo(b.type).name}: ${name(b.content.title) || '(untitled)'}`}
            render={(b) => <PageEditor c={b.content} set={(p) => edit('teach', b.uid, p)} />} />}
          {sec.id === 'procs' && <SortList {...common('procs')}
            title={(b) => `${typeInfo(b.type).emoji} ${typeInfo(b.type).name}: ${name(b.content.name) || '(unnamed)'} · ${b.content.items.length} steps`}
            render={(b) => <ProcessEditor c={b.content} set={(p) => edit('procs', b.uid, p)} />} />}
          {sec.id === 'chals' && <SortList {...common('chals')}
            title={(b) => `${typeInfo(b.type).emoji} ${typeInfo(b.type).name}${b.content.type === 'sort' ? ': ' + (name(b.content.ask) || '(no question)') : ''}`}
            render={(b) => {
              const points = pointsOf(st.rw[b.key])
              const setPoints = (v) => setRw({ ...st.rw, [b.key]: rule(v, '') })
              return b.content.type === 'business'
                ? <BusinessInfo points={points} setPoints={setPoints} />
                : <SortEditor c={b.content} set={(p) => edit('chals', b.uid, p)} points={points} setPoints={setPoints} />
            }} />}
          {sec.id === 'quiz' && <SortList {...common('quiz')}
            title={(b) => `❓ ${name(b.content.question) || '(new question)'}`}
            render={(b) => <QuizEditor c={b.content} set={(p) => edit('quiz', b.uid, p)} />} />}
          {sec.id === 'reward' && <RewardEditor rw={st.rw} setRw={setRw} badges={meta.rewards} chals={st.chals} />}
          {sec.id !== 'reward' && count[sec.id] === 0 && <p className="adm-empty">Nothing here yet. Click “+ ADD LEARNING STEP”.</p>}
        </div>
      ))}
    </div>
  )
}
