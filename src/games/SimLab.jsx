import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { runSim, bestIndex, comboId, comboCount } from '../lib/sim.js'

// Science simulation / prototype test: the child changes the settings, runs the test, writes down the readings in a table,
// then reads the table to find the best setting. The numbers are model values (the screen says so), not real measurements.
export default function SimLab({ c, onDone, save }) {
  const { t, L } = useLang()
  const first = () => Object.fromEntries(c.vars.map((v) => [v.key, v.options[0].id]))
  const [picks, setPicks] = useState(first)
  const [runs, setRuns] = useState([])
  const [chosen, setChosen] = useState(null)
  const [fin, setFin] = useState(false)
  const need = Math.min(c.minRuns || 3, comboCount(c))
  const label = (v, id) => L(v.options.find((o) => o.id === id).label)
  const run = () => {
    const id = comboId(c, picks)
    if (runs.some((r) => r.id === id)) return
    setRuns([...runs, { id, picks: { ...picks }, value: runSim(c, picks) }])
    setChosen(null)
  }
  const best = bestIndex(c, runs)
  const answer = (i) => {
    setChosen(i)
    if (i === best) {
      setFin(true)
      if (save) save({ title: c.title, unit: c.unit, runs: runs.map((r) => ({ settings: c.vars.map((v) => ({ name: v.label, choice: v.options.find((o) => o.id === r.picks[v.key]).label })), value: r.value })), best })
      onDone()
    }
  }
  return (
    <div className="card">
      <h3>🧪 {L(c.title)}</h3>
      {c.intro && <p>{L(c.intro)}</p>}
      {c.goal && <p className="help">🎯 {L(c.goal)}</p>}
      {c.vars.map((v) => (
        <label className="field" key={v.key}>{L(v.label)}
          <select value={picks[v.key]} disabled={fin} onChange={(e) => setPicks({ ...picks, [v.key]: e.target.value })}>
            {v.options.map((o) => <option key={o.id} value={o.id}>{L(o.label)}</option>)}
          </select>
        </label>
      ))}
      {!fin && <button className="btn" onClick={run}>{t('simRun')}</button>}
      {runs.length > 0 && (
        <>
          <p className="small"><b>{t('simRuns')}</b></p>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>#</th>{c.vars.map((v) => <th key={v.key}>{L(v.label)}</th>)}<th>{t('simReading')}</th></tr></thead>
              <tbody>{runs.map((r, i) => (
                <tr key={r.id}><td>{i + 1}</td>{c.vars.map((v) => <td key={v.key}>{label(v, r.picks[v.key])}</td>)}<td><b>{r.value} {c.unit}</b></td></tr>
              ))}</tbody></table>
          </div>
        </>
      )}
      {runs.length < need && <p className="small">{t('simNeed', { n: need })}</p>}
      {runs.length >= need && !fin && (
        <div>
          <p><b>{t('simWhich')}</b></p>
          {runs.map((r, i) => <button key={r.id} className="btn alt" onClick={() => answer(i)}>{i + 1}. {r.value} {c.unit}</button>)}
          {chosen !== null && chosen !== best && <p className="bad">{t('simWrong')}</p>}
        </div>
      )}
      {fin && <div className="result"><p className="good">{t('simCorrect')}</p><p>{L(c.explain)}</p></div>}
      <p className="small">{t('modelNote')}</p>
    </div>
  )
}
