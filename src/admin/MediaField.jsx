import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { signed, uploadMedia, MEDIA_RULES } from './api.js'

// Provided by the mission editor: the media list, a refresh function and the current mission.
export const MediaCtx = createContext({ assets: [], refresh: () => {}, mission: null })

const nice = { image: 'Image', audio: 'Audio', video: 'Animation / video' }

export default function MediaField({ kind, label, language, value, onChange }) {
  const { assets, refresh, mission } = useContext(MediaCtx)
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const file = useRef(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (value) signed(value).then((u) => { if (live) setUrl(u) })
    return () => { live = false }
  }, [value])
  const asset = assets.find((a) => a.path === value)
  const pick = assets.filter((a) => (kind === 'video' ? ['video', 'animation'].includes(a.kind) : a.kind === kind) && (!language || !a.language || a.language === language))
  const onFile = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      const row = await uploadMedia({ file: f, kind, missionId: mission && mission.id, missionSlug: mission && mission.slug, language })
      await refresh()
      onChange(row.path)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  return (
    <div className="adm-media">
      <span className="adm-fl">{label || nice[kind]}{language && <em> ({language === 'ha' ? 'Hausa' : 'English'})</em>}</span>
      {value && url && kind === 'image' && <img src={url} alt="" />}
      {value && url && kind === 'audio' && <audio src={url} controls preload="none" />}
      {value && url && kind === 'video' && (/\.gif$/i.test(value) ? <img src={url} alt="" /> : <video src={url} controls preload="none" />)}
      {value && <small>{asset ? asset.original_name || asset.path : value}{!asset && ' ⚠ not in library'}</small>}
      <div className="adm-actions">
        <button type="button" className="adm-btn ghost" disabled={busy} onClick={() => file.current.click()}>
          {busy ? 'Uploading…' : value ? `Replace ${nice[kind]}` : `Upload ${nice[kind]}`}
        </button>
        {value && <button type="button" className="adm-btn ghost" onClick={() => onChange('')}>Remove from this step</button>}
        {pick.length > 0 && (
          <select value="" onChange={(e) => e.target.value && onChange(e.target.value)}>
            <option value="">Choose from library…</option>
            {pick.map((a) => <option key={a.id} value={a.path}>{a.original_name || a.path}</option>)}
          </select>
        )}
      </div>
      <input ref={file} type="file" hidden accept={MEDIA_RULES[kind].exts.map((x) => '.' + x).join(',')} onChange={onFile} />
      <small>{MEDIA_RULES[kind].label}</small>
      {err && <p className="adm-err">{err}</p>}
    </div>
  )
}
