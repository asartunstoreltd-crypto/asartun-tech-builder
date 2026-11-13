import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bi, Confirm, Field, SortList, StatusBadge } from './ui.jsx'
import { blank, createMission, deleteMission, duplicateMission, listMissions, reorderMissions, setStatus, slugify } from './api.js'

const when = (t) => (t ? new Date(t).toLocaleString() : '–')

export default function MissionList() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState(null)
  const [creating, setCreating] = useState(null)
  const [dupOf, setDupOf] = useState(null)
  const [delOf, setDelOf] = useState(null)
  const load = useCallback(() => listMissions().then(setData).catch((e) => setMsg(e.message)), [])
  useEffect(() => { load() }, [load])
  if (!data) return msg ? <p className="adm-err">{msg}</p> : <p>Loading…</p>

  const act = async (fn) => { setMsg(null); try { await fn(); await load() } catch (e) { setMsg(e.message) } }
  const who = (id) => data.names[id] || (id ? 'an admin' : '–')
  const shown = data.missions.filter((m) => filter === 'all' || m.status === filter)
  const reorder = (items) => {
    if (filter !== 'all') return
    setData({ ...data, missions: items })
    act(() => reorderMissions(items.map((m) => m.id)))
  }

  return (
    <>
      <div className="adm-head">
        <h2>Missions</h2>
        <div className="adm-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option><option value="draft">Draft</option><option value="under_review">Under review</option>
            <option value="published">Published</option><option value="archived">Archived</option><option value="coming_soon">Coming soon</option>
          </select>
          <button className="adm-btn" onClick={() => setCreating({ ...blank(), emoji: '🛠️', slug: '' })}>+ Create New Mission</button>
        </div>
      </div>
      {msg && <p className="adm-err">{msg}</p>}
      <p className="adm-note">The order here is the order children see. {filter === 'all' ? 'Drag ⠿ or use ↑ ↓ to change it.' : 'Show “All” to change the order.'}</p>
      <SortList items={shown} setItems={reorder} keyOf={(m) => m.id}
        title={(m) => <>{m.emoji} {m.title.en || m.title.ha || m.slug} <StatusBadge status={m.status} /></>}
        duplicate={(i) => setDupOf({ m: shown[i], slug: shown[i].slug + '-copy' })}
        remove={(i) => setDelOf(shown[i])}
        render={(m) => (
          <>
            <p className="adm-note">Hausa: {m.title.ha || '–'} · Updated {when(m.updated_at)} by {who(m.updated_by)}</p>
            <div className="adm-actions">
              <Link className="adm-btn" to={`/admin/missions/${m.id}`}>Edit</Link>
              <Link className="adm-btn ghost" to={`/admin/missions/${m.id}?tab=preview`}>Preview</Link>
              {m.status === 'archived'
                ? <button className="adm-btn ghost" onClick={() => act(() => setStatus(m.id, 'draft'))}>Restore as Draft</button>
                : m.status !== 'published' && <button className="adm-btn ghost" onClick={() => act(() => setStatus(m.id, 'archived'))}>Archive</button>}
            </div>
          </>
        )} />
      {shown.length === 0 && <p className="adm-empty">No missions here.</p>}

      {creating && (
        <div className="adm-modal"><div className="adm-card">
          <h3>Create New Mission</h3>
          <Bi label="Mission title" value={creating} onChange={(v) => setCreating({ ...creating, ...v, slug: creating.slugTouched ? creating.slug : slugify(v.en) })} />
          <div className="adm-two">
            <Field label="Emoji"><input value={creating.emoji} maxLength={4} onChange={(e) => setCreating({ ...creating, emoji: e.target.value })} /></Field>
            <Field label="Web address name" hint="Letters, numbers and dashes. Cannot be changed later.">
              <input value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: slugify(e.target.value), slugTouched: true })} />
            </Field>
          </div>
          <div className="adm-actions">
            <button className="adm-btn" disabled={!creating.slug || !creating.en.trim() || !creating.ha.trim()}
              onClick={() => act(async () => { const id = await createMission(creating); nav(`/admin/missions/${id}`) })}>Create</button>
            <button className="adm-btn ghost" onClick={() => setCreating(null)}>Cancel</button>
          </div>
        </div></div>
      )}
      {dupOf && (
        <div className="adm-modal"><div className="adm-card">
          <h3>Duplicate “{dupOf.m.title.en || dupOf.m.slug}”</h3>
          <p>A copy is made as a <b>Draft</b> that you can change freely. Pictures and audio are shared with the original.</p>
          <Field label="Web address name for the copy"><input value={dupOf.slug} onChange={(e) => setDupOf({ ...dupOf, slug: slugify(e.target.value) })} /></Field>
          <div className="adm-actions">
            <button className="adm-btn" disabled={!dupOf.slug} onClick={() => act(async () => { const id = await duplicateMission(dupOf.m.id, dupOf.slug); setDupOf(null); nav(`/admin/missions/${id}`) })}>Duplicate</button>
            <button className="adm-btn ghost" onClick={() => setDupOf(null)}>Cancel</button>
          </div>
        </div></div>
      )}
      {delOf && (
        <Confirm title="Delete this mission?" phrase={delOf.slug} yesText="Delete permanently"
          onNo={() => setDelOf(null)} onYes={() => { const m = delOf; setDelOf(null); act(() => deleteMission(m.id)) }}>
          <p>“{delOf.title.en || delOf.slug}” and all its lesson steps and questions will be removed for ever. <b>Archive</b> keeps it safely instead.</p>
          {delOf.status === 'published' && <p className="adm-err">Published missions cannot be deleted. Unpublish or archive first.</p>}
        </Confirm>
      )}
    </>
  )
}
