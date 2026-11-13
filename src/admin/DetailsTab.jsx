import { useState } from 'react'
import { Bi, Field } from './ui.jsx'
import MediaField from './MediaField.jsx'
import { blank, createCategory, slugify } from './api.js'

export default function DetailsTab({ st, setSt, meta, reloadMeta }) {
  const m = st.m
  const set = (p) => setSt((s) => ({ ...s, m: { ...s.m, ...p } }))
  const [cat, setCat] = useState(null)
  const [err, setErr] = useState('')
  const saveCat = async () => {
    try { await createCategory({ slug: slugify(cat.en), ha: cat.ha, en: cat.en }); setCat(null); await reloadMeta() } catch (e) { setErr(e.message) }
  }
  return (
    <div className="adm-card">
      <div className="adm-two">
        <Field label="Emoji"><input value={m.emoji || ''} maxLength={4} onChange={(e) => set({ emoji: e.target.value })} /></Field>
        <Field label="Web address name (cannot change)" hint="Used inside learner progress, so it is locked after creation."><input value={m.slug} readOnly /></Field>
      </div>
      <Bi label="Mission title" value={m.title} onChange={(v) => set({ title: v })} />
      <Bi label="Short description" rows={3} value={m.description} onChange={(v) => set({ description: v })} />
      <div className="adm-two">
        <Field label="Category">
          <select value={m.category_id || ''} onChange={(e) => set({ category_id: e.target.value || null })}>
            <option value="">(none)</option>
            {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name.en || c.slug}</option>)}
          </select>
        </Field>
        <div><button type="button" className="adm-btn ghost" onClick={() => setCat(blank())}>+ New category</button></div>
      </div>
      {cat && (
        <div className="adm-sub">
          <Bi label="New category name" value={cat} onChange={setCat} />
          <button type="button" className="adm-btn" disabled={!cat.en.trim() || !cat.ha.trim()} onClick={saveCat}>Save category</button>
          {err && <p className="adm-err">{err}</p>}
        </div>
      )}
      <div className="adm-two">
        <Field label="Youngest age"><input type="number" min="3" max="18" value={m.age_min} onChange={(e) => set({ age_min: e.target.value })} /></Field>
        <Field label="Oldest age"><input type="number" min="3" max="18" value={m.age_max} onChange={(e) => set({ age_max: e.target.value })} /></Field>
      </div>
      <div className="adm-two">
        <Field label="Difficulty">
          <select value={m.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Estimated learning time (minutes)"><input type="number" min="1" max="600" value={m.estimated_minutes || ''} onChange={(e) => set({ estimated_minutes: e.target.value })} /></Field>
      </div>
      <MediaField kind="image" label="Cover image" value={m.cover_image_path} onChange={(v) => set({ cover_image_path: v })} />
      <h4>Learning objectives</h4>
      {m.objectives.map((o, i) => (
        <div className="adm-sub" key={i}>
          <Bi label={`Objective ${i + 1} (e.g. The child can name 3 uses of cassava)`} value={o} onChange={(v) => set({ objectives: m.objectives.map((x, j) => (j === i ? v : x)) })} />
          <button type="button" className="adm-btn ghost" onClick={() => set({ objectives: m.objectives.filter((_, j) => j !== i) })}>Remove objective</button>
        </div>
      ))}
      <button type="button" className="adm-btn ghost" onClick={() => set({ objectives: [...m.objectives, blank()] })}>+ Add objective</button>
    </div>
  )
}
