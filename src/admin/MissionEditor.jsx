import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { StatusBadge } from './ui.jsx'
import { MediaCtx } from './MediaField.jsx'
import DetailsTab from './DetailsTab.jsx'
import LessonTab from './LessonTab.jsx'
import PreviewTab from './PreviewTab.jsx'
import PublishTab from './PublishTab.jsx'
import { loadFull, loadAssets, loadCategories, saveFull, setStatus, toRows, missionPatch } from './api.js'
import { checkMission } from './validate.js'

const TABS = [['details', '1. Details'], ['lesson', '2. Lesson'], ['preview', '3. Preview'], ['publish', '4. Check & Publish']]

export default function MissionEditor() {
  const { id } = useParams()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'details'
  const [st, setStRaw] = useState(null)
  const [meta, setMeta] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const d = await loadFull(id)
    setStRaw(d.st); setMeta(d.meta); setDirty(false)
  }, [id])
  useEffect(() => { load().catch((e) => setMsg({ err: e.message })) }, [load])
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const setSt = useCallback((fn) => { setStRaw((s) => (typeof fn === 'function' ? fn(s) : fn)); setDirty(true) }, [])
  const rows = useMemo(() => (st ? toRows(st) : null), [st])
  const known = useMemo(() => new Set(meta ? meta.assets.map((a) => a.path) : []), [meta])
  const check = useMemo(() => (st ? checkMission(st, rows, known) : null), [st, rows, known])
  const refreshAssets = useCallback(async () => { const a = await loadAssets(); setMeta((m) => ({ ...m, assets: a })) }, [])
  const reloadCats = useCallback(async () => { const c = await loadCategories(); setMeta((m) => ({ ...m, categories: c })) }, [])
  const ctx = useMemo(() => ({ assets: meta ? meta.assets : [], refresh: refreshAssets, mission: st ? { id, slug: st.m.slug } : null }), [meta, refreshAssets, st, id])

  if (!st || !meta) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const locked = st.m.status === 'published'

  const run = (fn, ok) => async () => {
    setBusy(true); setMsg(null)
    try { await fn(); await load(); setMsg({ ok }) } catch (e) { setMsg({ err: e.message }) } finally { setBusy(false) }
  }
  const save = () => saveFull(id, missionPatch(st), rows)
  const actions = {
    save: run(save, 'Saved.'),
    review: run(async () => { await save(); await setStatus(id, 'under_review') }, 'Saved and sent for review.'),
    publish: run(async () => { await save(); await setStatus(id, 'published') }, '🎉 Published. Children can now see this mission.'),
    unpublish: run(() => setStatus(id, 'draft'), 'Unpublished. Children can no longer see it. You can edit it now.'),
    archive: run(async () => { await save(); await setStatus(id, 'archived') }, 'Archived (not deleted).'),
    restore: run(() => setStatus(id, 'draft'), 'Restored as Draft.'),
  }

  return (
    <MediaCtx.Provider value={ctx}>
      <div className="adm-editor">
        <div className="adm-head">
          <div>
            <Link to="/admin/missions">← All missions</Link>
            <h2>{st.m.emoji} {st.m.title.en || st.m.title.ha || st.m.slug} <StatusBadge status={st.m.status} /></h2>
          </div>
          <div className="adm-actions">
            {!locked && <button className="adm-btn" disabled={busy || !dirty} onClick={actions.save}>{dirty ? 'Save Draft' : 'Saved ✓'}</button>}
            <button className="adm-btn ghost" onClick={() => setSp({ tab: 'preview' })}>Preview</button>
            {!locked && <button className="adm-btn ghost" onClick={() => setSp({ tab: 'publish' })}>Publish…</button>}
          </div>
        </div>
        {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
        {locked && tab !== 'preview' && tab !== 'publish' && <p className="adm-warn">This mission is published and locked. Go to “Check &amp; Publish” and unpublish it to edit.</p>}
        <div className="adm-tabs">{TABS.map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setSp({ tab: k })}>{n}</button>)}</div>

        {tab === 'details' && <fieldset disabled={locked} className="adm-fs"><DetailsTab st={st} setSt={setSt} meta={meta} reloadMeta={reloadCats} /></fieldset>}
        {tab === 'lesson' && <fieldset disabled={locked} className="adm-fs"><LessonTab st={st} setSt={setSt} meta={meta} /></fieldset>}
        {tab === 'preview' && <PreviewTab st={st} rows={rows} />}
        {tab === 'publish' && <PublishTab st={st} check={check} meta={meta} dirty={dirty} busy={busy} actions={actions} />}
      </div>
    </MediaCtx.Provider>
  )
}
