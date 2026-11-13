import { useCallback, useEffect, useRef, useState } from 'react'
import { Confirm, Field } from './ui.jsx'
import { deleteMedia, loadAssets, mediaUsage, ruleKind, signed, uploadMedia, MEDIA_RULES, stageLabel } from './api.js'
import { supabaseAdmin } from '../lib/supabase.js'

function Preview({ a }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { signed(a.path).then(setUrl) }, [a.path, a.updated_at])
  if (!url) return <span className="adm-thumb">…</span>
  if (a.kind === 'image' || a.kind === 'animation') return <img className="adm-thumb" src={url} alt="" />
  if (a.kind === 'audio') return <audio src={url} controls preload="none" />
  return <video className="adm-thumb" src={url} controls preload="none" />
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState(null)
  const [missions, setMissions] = useState([])
  const [kind, setKind] = useState('all')
  const [msg, setMsg] = useState(null)
  const [usage, setUsage] = useState(null)       // {asset, rows}
  const [del, setDel] = useState(null)
  const [up, setUp] = useState({ kind: 'image', language: '', mission: '' })
  const [busy, setBusy] = useState(false)
  const newFile = useRef(null)
  const replaceFile = useRef(null)
  const [replacing, setReplacing] = useState(null)

  const load = useCallback(async () => {
    const [a, m] = await Promise.all([loadAssets(), supabaseAdmin.from('missions').select('id,slug,title')])
    setAssets(a); setMissions(m.data || [])
  }, [])
  useEffect(() => { load().catch((e) => setMsg({ err: e.message })) }, [load])
  if (!assets) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>

  const slugOf = (id) => (missions.find((m) => m.id === id) || {}).slug || '–'
  const guard = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); await load(); if (ok) setMsg({ ok }) } catch (e) { setMsg({ err: e.message }) } finally { setBusy(false) } }
  const onNew = (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    const m = missions.find((x) => x.id === up.mission)
    guard(() => uploadMedia({ file: f, kind: up.kind, missionId: up.mission || null, missionSlug: m && m.slug, language: up.kind === 'audio' ? up.language || null : null }), 'Uploaded.')
  }
  const onReplace = (e) => {
    const f = e.target.files[0]; e.target.value = ''
    const a = replacing
    if (!f || !a) return
    guard(() => uploadMedia({ file: f, kind: ruleKind(a.kind), replace: a }), 'File replaced. Lessons that use it now show the new file.')
  }
  const showUsage = (a) => guard(async () => setUsage({ a, rows: await mediaUsage(a.path) }))
  const askDelete = async (a) => {
    setBusy(true); setMsg(null)
    try { setDel({ a, rows: await mediaUsage(a.path) }) } catch (e) { setMsg({ err: e.message }) } finally { setBusy(false) }
  }
  const list = assets.filter((a) => kind === 'all' || a.kind === kind)
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round((n || 0) / 1024) + ' KB')
  const publishedUse = del ? del.rows.filter((r) => r.status === 'published') : []

  return (
    <>
      <h2>Media Library</h2>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      <div className="adm-card">
        <h3>Upload a new file</h3>
        <div className="adm-two">
          <Field label="Type">
            <select value={up.kind} onChange={(e) => setUp({ ...up, kind: e.target.value })}>
              <option value="image">Image</option><option value="audio">Audio narration</option><option value="video">Animation / video</option>
            </select>
          </Field>
          {up.kind === 'audio' && (
            <Field label="Language"><select value={up.language} onChange={(e) => setUp({ ...up, language: e.target.value })}>
              <option value="">(not set)</option><option value="ha">Hausa</option><option value="en">English</option></select></Field>
          )}
          <Field label="Belongs to mission (optional)">
            <select value={up.mission} onChange={(e) => setUp({ ...up, mission: e.target.value })}>
              <option value="">(shared)</option>{missions.map((m) => <option key={m.id} value={m.id}>{m.title.en || m.slug}</option>)}
            </select>
          </Field>
        </div>
        <button className="adm-btn" disabled={busy} onClick={() => newFile.current.click()}>{busy ? 'Working…' : 'Upload'}</button>
        <small> {MEDIA_RULES[up.kind].label}</small>
        <input ref={newFile} type="file" hidden accept={MEDIA_RULES[up.kind].exts.map((x) => '.' + x).join(',')} onChange={onNew} />
        <input ref={replaceFile} type="file" hidden onChange={onReplace} />
      </div>

      <div className="adm-actions">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All media</option><option value="image">Images</option><option value="audio">Audio</option>
          <option value="animation">Animations</option><option value="video">Videos</option>
        </select>
        <span className="adm-note">{list.length} file(s)</span>
      </div>
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr><th>Preview</th><th>File</th><th>Type</th><th>Language</th><th>Mission</th><th>Uploaded</th><th>Actions</th></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={a.id}>
            <td><Preview a={a} /></td>
            <td>{a.original_name || a.path}<br /><small>{kb(a.size_bytes)}</small></td>
            <td>{a.kind}</td><td>{a.language === 'ha' ? 'Hausa' : a.language === 'en' ? 'English' : '–'}</td>
            <td>{slugOf(a.mission_id)}</td><td>{new Date(a.created_at).toLocaleDateString()}</td>
            <td className="adm-cellbtns">
              <button className="adm-btn ghost" disabled={busy} onClick={() => showUsage(a)}>Where used</button>
              <button className="adm-btn ghost" disabled={busy} onClick={() => { setReplacing(a); replaceFile.current.accept = MEDIA_RULES[ruleKind(a.kind)].exts.map((x) => '.' + x).join(','); replaceFile.current.click() }}>Replace</button>
              <button className="adm-btn danger" disabled={busy} onClick={() => askDelete(a)}>Delete</button>
            </td>
          </tr>))}</tbody>
      </table></div>

      {usage && (
        <Confirm title="Where this file is used" yesText="Close" danger={false} onYes={() => setUsage(null)} onNo={() => setUsage(null)}>
          {usage.rows.length === 0 ? <p>Not used by any mission yet.</p>
            : <ul>{usage.rows.map((r, i) => <li key={i}>{r.slug} ({stageLabel[r.status] || r.status}): {r.location}</li>)}</ul>}
        </Confirm>
      )}
      {del && publishedUse.length > 0 && (
        <Confirm title="This file cannot be deleted" yesText="OK" danger={false} onYes={() => setDel(null)} onNo={() => setDel(null)}>
          <p>It is used by a <b>published</b> mission. Replace the file instead, or unpublish the mission first.</p>
          <ul>{publishedUse.map((r, i) => <li key={i}>{r.slug}: {r.location}</li>)}</ul>
        </Confirm>
      )}
      {del && publishedUse.length === 0 && (
        <Confirm title="Delete this file?" onNo={() => setDel(null)} onYes={() => { const a = del.a; setDel(null); guard(() => deleteMedia(a), 'Deleted.') }}>
          <p>{del.a.original_name || del.a.path}</p>
          {del.rows.length > 0 && <><p className="adm-warn">Still used by draft / unpublished missions. Those steps will show a broken-media warning:</p>
            <ul>{del.rows.map((r, i) => <li key={i}>{r.slug} ({stageLabel[r.status] || r.status}): {r.location}</li>)}</ul></>}
        </Confirm>
      )}
    </>
  )
}
