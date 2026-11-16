import { Bi, Field } from './ui.jsx'
import { blank, rid } from './api.js'

// Editors for the Phase 2 challenge types: Prediction, Science simulation / prototype test, Business plan, Design brief / presentation.
const Points = ({ points, setPoints }) => (
  <Field label="Points for finishing this challenge"><input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
)
const MODEL = <p className="adm-note">Numbers in a prediction or simulation are <b>model values you write</b>, not real measurements. The child sees a note saying so. Use real measured values only if you have them from a real test.</p>

export function PredictEditor({ c, set, points, setPoints }) {
  const setOpt = (i, v) => set({ options: c.options.map((o, j) => (j === i ? v : o)) })
  const rows = c.table || []
  const setRow = (i, p) => set({ table: rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  return (
    <>
      <p>The child <b>predicts first</b>, then sees the result and your explanation. Points are given for predicting and reading the result: a wrong prediction is part of learning.</p>
      {MODEL}
      <Bi label="Question (e.g. Which pot will stay coolest?)" value={c.ask} onChange={(v) => set({ ask: v })} />
      <Points points={points} setPoints={setPoints} />
      <h4>Choices (pick the correct one)</h4>
      {c.options.map((o, i) => (
        <div className="adm-sub" key={i}>
          <label className="adm-chk"><input type="radio" checked={c.correct === i} onChange={() => set({ correct: i })} /> Correct choice</label>
          <Bi label={`Choice ${i + 1}`} value={o} onChange={(v) => setOpt(i, v)} />
          {c.options.length > 2 && <button type="button" className="adm-btn ghost" onClick={() => set({ options: c.options.filter((_, j) => j !== i), correct: c.correct === i ? 0 : c.correct > i ? c.correct - 1 : c.correct })}>Remove choice</button>}
        </div>
      ))}
      {c.options.length < 4 && <button type="button" className="adm-btn ghost" onClick={() => set({ options: [...c.options, blank()] })}>+ Add choice</button>}
      <h4>Result table shown after the prediction (optional)</h4>
      {rows.map((r, i) => (
        <div className="adm-sub" key={i}>
          <Bi label="Row name" value={r.label} onChange={(v) => setRow(i, { label: v })} />
          <Field label="Value (same in both languages, e.g. 24 °C)"><input value={r.value || ''} onChange={(e) => setRow(i, { value: e.target.value })} /></Field>
          <button type="button" className="adm-btn ghost" onClick={() => set({ table: rows.filter((_, j) => j !== i) })}>Remove row</button>
        </div>
      ))}
      {rows.length < 6 && <button type="button" className="adm-btn ghost" onClick={() => set({ table: [...rows, { label: blank(), value: '' }] })}>+ Add row</button>}
      <Bi label="Explanation (why the result is what it is)" rows={3} value={c.explain} onChange={(v) => set({ explain: v })} />
    </>
  )
}

const newOpt = () => ({ id: 'o_' + rid(), label: blank(), effect: 0 })
export function SimEditor({ c, set, points, setPoints }) {
  const setVar = (i, p) => set({ vars: c.vars.map((v, j) => (j === i ? { ...v, ...p } : v)) })
  const setOpt = (i, k, p) => setVar(i, { options: c.vars[i].options.map((o, j) => (j === k ? { ...o, ...p } : o)) })
  return (
    <>
      <p>The child changes settings, runs the test, writes the readings in a table and finds the best setting. The reading is: <b>starting value + the effect of each chosen setting</b>.</p>
      {MODEL}
      <Bi label="Title" value={c.title} onChange={(v) => set({ title: v })} />
      <Bi label="Introduction (optional)" rows={2} value={c.intro || blank()} onChange={(v) => set({ intro: v })} />
      <Bi label="Goal (e.g. Find the setting that keeps the inside coolest)" rows={2} value={c.goal || blank()} onChange={(v) => set({ goal: v })} />
      <Points points={points} setPoints={setPoints} />
      <div className="adm-two">
        <Field label="Unit (e.g. °C)"><input value={c.unit || ''} maxLength={8} onChange={(e) => set({ unit: e.target.value })} /></Field>
        <Field label="Starting value"><input type="number" value={c.base} onChange={(e) => set({ base: e.target.value === '' ? 0 : Number(e.target.value) })} /></Field>
      </div>
      <div className="adm-two">
        <Field label="Which reading is best?">
          <select value={c.better} onChange={(e) => set({ better: e.target.value })}><option value="low">The lowest</option><option value="high">The highest</option></select>
        </Field>
        <Field label="Different tests needed before answering"><input type="number" min="2" max="8" value={c.minRuns || 3} onChange={(e) => set({ minRuns: Math.min(8, Math.max(2, Number(e.target.value) || 3)) })} /></Field>
      </div>
      <h4>Settings the child can change (1 to 3)</h4>
      {c.vars.map((v, i) => (
        <div className="adm-sub" key={v.key}>
          <Bi label="Setting name (e.g. Where is the pot?)" value={v.label} onChange={(x) => setVar(i, { label: x })} />
          {v.options.map((o, k) => (
            <div className="adm-sub" key={o.id}>
              <Bi label={`Option ${k + 1}`} value={o.label} onChange={(x) => setOpt(i, k, { label: x })} />
              <Field label="Effect on the reading (e.g. -3 or 4)"><input type="number" value={o.effect} onChange={(e) => setOpt(i, k, { effect: e.target.value === '' ? 0 : Number(e.target.value) })} /></Field>
              {v.options.length > 2 && <button type="button" className="adm-btn ghost" onClick={() => setVar(i, { options: v.options.filter((_, j) => j !== k) })}>Remove option</button>}
            </div>
          ))}
          {v.options.length < 4 && <button type="button" className="adm-btn ghost" onClick={() => setVar(i, { options: [...v.options, newOpt()] })}>+ Add option</button>}
          {c.vars.length > 1 && <button type="button" className="adm-btn ghost" onClick={() => set({ vars: c.vars.filter((_, j) => j !== i) })}>Remove this setting</button>}
        </div>
      ))}
      {c.vars.length < 3 && <button type="button" className="adm-btn ghost" onClick={() => set({ vars: [...c.vars, { key: 'v_' + rid(), label: blank(), options: [newOpt(), newOpt()] }] })}>+ Add a setting</button>}
      <Bi label="Explanation shown when the child finds the best setting" rows={3} value={c.explain} onChange={(v) => set({ explain: v })} />
    </>
  )
}

export function PlanInfo({ points, setPoints }) {
  return (
    <>
      <p>This is the <b>business plan</b> calculator: the child lists the materials for one unit, a one-off cost, a selling price and how many units they plan to sell. It shows unit cost, total cost, revenue, profit and break-even. It needs no setup.</p>
      <p className="adm-note">Points are given only when the child enters a real attempt (a price, at least one cost and a number of units). Their numbers are saved to their portfolio.</p>
      <Points points={points} setPoints={setPoints} />
    </>
  )
}

export function ReflectEditor({ c, set, points, setPoints }) {
  const setP = (i, v) => set({ prompts: c.prompts.map((p, j) => (j === i ? v : p)) })
  return (
    <>
      <p>The child answers your guiding questions <b>in their own words</b>. The answers are saved to their portfolio, where a teacher can read and assess them. Use it for a design brief, a test report or a project presentation.</p>
      <Bi label="Title (e.g. Present your idea)" value={c.title} onChange={(v) => set({ title: v })} />
      <Points points={points} setPoints={setPoints} />
      <Field label="Minimum letters in each answer"><input type="number" min="5" max="200" value={c.minChars || 15} onChange={(e) => set({ minChars: Math.min(200, Math.max(5, Number(e.target.value) || 15)) })} /></Field>
      <h4>Questions (1 to 6)</h4>
      {c.prompts.map((p, i) => (
        <div className="adm-sub" key={i}>
          <Bi label={`Question ${i + 1}`} value={p} onChange={(v) => setP(i, v)} />
          {c.prompts.length > 1 && <button type="button" className="adm-btn ghost" onClick={() => set({ prompts: c.prompts.filter((_, j) => j !== i) })}>Remove question</button>}
        </div>
      ))}
      {c.prompts.length < 6 && <button type="button" className="adm-btn ghost" onClick={() => set({ prompts: [...c.prompts, blank()] })}>+ Add question</button>}
      <p className="adm-note">Children are told not to write their real name, phone number or address. Teachers can see these answers only for learners who joined their school.</p>
    </>
  )
}
