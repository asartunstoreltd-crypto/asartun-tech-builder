import { Bi, Field, SortList } from './ui.jsx'
import MediaField from './MediaField.jsx'
import { blank, newItem, newSortItem, rid, pointsOf, badgeOf, rule } from './api.js'

const LABELS = [['whatIs', 'What is it?'], ['whatDoes', 'What does it do?'], ['whyNeeded', 'Why is it needed?'], ['fact', 'Did you know?']]
const Emoji = ({ value, onChange }) => (
  <Field label="Emoji (picture)"><input value={value || ''} maxLength={4} onChange={(e) => onChange(e.target.value)} /></Field>
)
const Media2 = ({ c, set }) => (
  <>
    <div className="adm-two">
      <MediaField kind="image" value={c.image} onChange={(v) => set({ image: v })} />
      <MediaField kind="video" label="Animation or video (optional)" value={c.video} onChange={(v) => set({ video: v })} />
    </div>
    <div className="adm-two">
      <MediaField kind="audio" language="ha" value={c.audio_ha} onChange={(v) => set({ audio_ha: v })} />
      <MediaField kind="audio" language="en" value={c.audio_en} onChange={(v) => set({ audio_en: v })} />
    </div>
  </>
)

// ---- Story / Introduction / Teach / Materials / Summary ----
export function PageEditor({ c, set }) {
  const setLine = (i, p) => set({ lines: c.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) })
  return (
    <>
      <div className="adm-two">
        <Emoji value={c.emoji} onChange={(v) => set({ emoji: v })} />
        <label className="adm-chk"><input type="checkbox" checked={Boolean(c.warn)} onChange={(e) => set({ warn: e.target.checked })} /> Safety page (highlighted)</label>
      </div>
      <Bi label="Title" value={c.title} onChange={(v) => set({ title: v })} />
      {c.lines.map((l, i) => (
        <div className="adm-sub" key={i}>
          <div className="adm-two">
            <Field label={`Line ${i + 1} heading`}>
              <select value={l.k || ''} onChange={(e) => setLine(i, { k: e.target.value || undefined })}>
                <option value="">(no heading)</option>
                {LABELS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </Field>
            <button type="button" className="adm-btn ghost" onClick={() => set({ lines: c.lines.filter((_, j) => j !== i) })}>Remove line</button>
          </div>
          <Bi label="Text (short sentences)" rows={2} value={l.text} onChange={(v) => setLine(i, { text: v })} />
        </div>
      ))}
      <button type="button" className="adm-btn ghost" onClick={() => set({ lines: [...c.lines, { text: blank() }] })}>+ Add line</button>
      <Bi label="Child-friendly instruction (optional)" rows={2} value={c.instructions || blank()} onChange={(v) => set({ instructions: v })} />
      <Media2 c={c} set={set} />
    </>
  )
}

// ---- Demonstration / Practice / Ordering: one process with ordered steps ----
export function ProcessEditor({ c, set }) {
  const setItems = (items) => set({ items })
  const setItem = (uid, p) => set({ items: c.items.map((x) => (x.uid === uid ? { ...x, ...p } : x)) })
  return (
    <>
      <div className="adm-two"><Emoji value={c.emoji} onChange={(v) => set({ emoji: v })} /></div>
      <Bi label="Name of the product / process" value={c.name} onChange={(v) => set({ name: v })} />
      <Bi label="What is different about this one? (optional)" rows={2} value={c.summary || blank()} onChange={(v) => set({ summary: v })} />
      <Bi label="Child-friendly instruction (optional)" rows={2} value={c.instructions || blank()} onChange={(v) => set({ instructions: v })} />
      <h4>Steps, in the correct order (the child watches them, then puts them in order)</h4>
      <SortList items={c.items} setItems={setItems} keyOf={(i) => i.uid}
        title={(i) => `${i.emoji || ''} ${(i.name && (i.name.en || i.name.ha)) || '(new step)'}`}
        duplicate={(n) => set({ items: [...c.items.slice(0, n + 1), { ...c.items[n], uid: rid() }, ...c.items.slice(n + 1)] })}
        remove={(n) => { if (window.confirm('Delete this step?')) set({ items: c.items.filter((_, j) => j !== n) }) }}
        render={(i) => (
          <>
            <div className="adm-two">
              <Emoji value={i.emoji} onChange={(v) => setItem(i.uid, { emoji: v })} />
              <label className="adm-chk"><input type="checkbox" checked={Boolean(i.kid)} onChange={(e) => setItem(i.uid, { kid: e.target.checked })} /> A child can help (adult nearby)</label>
            </div>
            <Bi label="Step name" value={i.name} onChange={(v) => setItem(i.uid, { name: v })} />
            <Bi label="Short explanation" rows={2} value={i.text} onChange={(v) => setItem(i.uid, { text: v })} />
            <Media2 c={i} set={(p) => setItem(i.uid, p)} />
          </>
        )} />
      <button type="button" className="adm-btn ghost" onClick={() => set({ items: [...c.items, newItem()] })}>+ Add step</button>
    </>
  )
}

// ---- Drag and Drop / Challenge: items sorted into groups ----
export function SortEditor({ c, set, points, setPoints }) {
  const setOpt = (kind, p) => set({ options: c.options.map((o) => (o.kind === kind ? { ...o, ...p } : o)) })
  const setItem = (uid, p) => set({ items: c.items.map((x) => (x.uid === uid ? { ...x, ...p } : x)) })
  const removeOpt = (kind) => {
    const left = c.options.filter((o) => o.kind !== kind)
    set({ options: left, items: c.items.map((i) => (i.kind === kind ? { ...i, kind: left[0].kind } : i)) })
  }
  return (
    <>
      <Bi label="Question for the child (e.g. Where does this belong?)" value={c.ask} onChange={(v) => set({ ask: v })} />
      <Bi label="Child-friendly instruction (optional)" rows={2} value={c.instructions || blank()} onChange={(v) => set({ instructions: v })} />
      <Field label="Points for finishing this challenge"><input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
      <h4>Target groups (2 to 4)</h4>
      {c.options.map((o) => (
        <div className="adm-sub" key={o.kind}>
          <div className="adm-two">
            <Field label="Emoji"><input value={o.icon || ''} maxLength={4} onChange={(e) => setOpt(o.kind, { icon: e.target.value })} /></Field>
            {c.options.length > 2 && <button type="button" className="adm-btn ghost" onClick={() => removeOpt(o.kind)}>Remove group</button>}
          </div>
          <Bi label="Group name" value={o.label} onChange={(v) => setOpt(o.kind, { label: v })} />
        </div>
      ))}
      {c.options.length < 4 && <button type="button" className="adm-btn ghost" onClick={() => set({ options: [...c.options, { kind: 'g_' + rid(), icon: '📦', label: blank() }] })}>+ Add group</button>}
      <h4>Items to sort (each has one correct group)</h4>
      <SortList items={c.items} setItems={(items) => set({ items })} keyOf={(i) => i.uid}
        title={(i) => `${i.emoji || ''} ${(i.name && (i.name.en || i.name.ha)) || '(new item)'}`}
        duplicate={(n) => set({ items: [...c.items.slice(0, n + 1), { ...c.items[n], uid: rid() }, ...c.items.slice(n + 1)] })}
        remove={(n) => { if (window.confirm('Delete this item?')) set({ items: c.items.filter((_, j) => j !== n) }) }}
        render={(i) => (
          <>
            <div className="adm-two">
              <Emoji value={i.emoji} onChange={(v) => setItem(i.uid, { emoji: v })} />
              <Field label="Correct group">
                <select value={i.kind} onChange={(e) => setItem(i.uid, { kind: e.target.value })}>
                  {c.options.map((o) => <option key={o.kind} value={o.kind}>{o.icon} {o.label.en || o.label.ha || '(unnamed group)'}</option>)}
                </select>
              </Field>
            </div>
            <Bi label="Item name" value={i.name} onChange={(v) => setItem(i.uid, { name: v })} />
            <Bi label="Why? (shown after the answer, optional)" rows={2} value={i.why || blank()} onChange={(v) => setItem(i.uid, { why: v })} />
            <MediaField kind="image" label="Picture instead of emoji (optional)" value={i.image} onChange={(v) => setItem(i.uid, { image: v })} />
          </>
        )} />
      <button type="button" className="adm-btn ghost" onClick={() => set({ items: [...c.items, newSortItem(c.options[0].kind)] })}>+ Add item</button>
    </>
  )
}

export function BusinessInfo({ points, setPoints }) {
  return (
    <>
      <p>This is the ready-made <b>business calculator</b>: the child types material, processing and packaging costs and a selling price, and sees total cost and profit. It needs no setup.</p>
      <p className="adm-note">Other kinds of simulation (circuits, solar panels, robots) need a developer to build the interactive part first.</p>
      <Field label="Points for finishing it"><input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
    </>
  )
}

// ---- Quiz question ----
export function QuizEditor({ c, set }) {
  const setOpt = (i, v) => set({ options: c.options.map((o, j) => (j === i ? v : o)) })
  const media = c.media || {}
  const setMedia = (p) => set({ media: { ...media, ...p } })
  return (
    <>
      <Bi label="Question" rows={2} value={c.question} onChange={(v) => set({ question: v })} />
      <h4>Answers (choose the correct one)</h4>
      {c.options.map((o, i) => (
        <div className="adm-sub" key={i}>
          <label className="adm-chk"><input type="radio" checked={c.correct === i} onChange={() => set({ correct: i })} /> Correct answer</label>
          <Bi label={`Answer ${i + 1}`} value={o} onChange={(v) => setOpt(i, v)} />
          {c.options.length > 2 && (
            <button type="button" className="adm-btn ghost" onClick={() => set({ options: c.options.filter((_, j) => j !== i), correct: c.correct === i ? 0 : c.correct > i ? c.correct - 1 : c.correct })}>Remove answer</button>
          )}
        </div>
      ))}
      {c.options.length < 5 && <button type="button" className="adm-btn ghost" onClick={() => set({ options: [...c.options, blank()] })}>+ Add answer</button>}
      <Bi label="Explanation (shown when the child answers)" rows={2} value={c.explanation} onChange={(v) => set({ explanation: v })} />
      <MediaField kind="image" value={media.image} onChange={(v) => setMedia({ image: v })} />
      <div className="adm-two">
        <MediaField kind="audio" language="ha" value={media.audio_ha} onChange={(v) => setMedia({ audio_ha: v })} />
        <MediaField kind="audio" language="en" value={media.audio_en} onChange={(v) => setMedia({ audio_en: v })} />
      </div>
    </>
  )
}

// ---- Reward rules ----
export function RewardEditor({ rw, setRw, badges, chals }) {
  const set = (k, pts, badge) => setRw({ ...rw, [k]: rule(pts, badge) })
  const Row = ({ k, label, badge }) => (
    <div className="adm-two">
      <Field label={label}><input type="number" min="0" value={pointsOf(rw[k])} onChange={(e) => set(k, e.target.value, badgeOf(rw[k]))} /></Field>
      {badge && (
        <Field label="Badge (optional)">
          <select value={badgeOf(rw[k])} onChange={(e) => set(k, pointsOf(rw[k]), e.target.value)}>
            <option value="">(no badge)</option>
            {badges.map((b) => <option key={b.slug} value={b.slug}>{(b.name && b.name.en) || b.slug}</option>)}
          </select>
        </Field>
      )}
    </div>
  )
  return (
    <>
      <Row k="teach" label="Points: finished the Learn stage" badge />
      <Row k="show" label="Points: each demonstration watched" />
      <Row k="practice" label="Points: each practice finished" badge />
      {chals.map((c, i) => c.key && (
        <Row key={c.key} k={c.key} label={`Points: challenge ${i + 1}`} />
      ))}
      <Row k="quiz" label="Points: each correct quiz answer" />
      <Row k="finish" label="Points: finished the whole mission" badge />
      <p className="adm-note">Each reward is given once per child, so replaying cannot farm points. New badges (name, picture) are created by the Super Admin in the database <code>rewards</code> table.</p>
    </>
  )
}
