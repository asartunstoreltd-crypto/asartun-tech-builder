import { StatusBadge } from './ui.jsx'
import { typeInfo } from './api.js'

const when = (t) => (t ? new Date(t).toLocaleString() : '–')

export default function PublishTab({ st, check, meta, dirty, busy, actions }) {
  const status = st.m.status
  const who = (id) => (id && meta.names[id]) || (id ? 'an admin' : '–')
  const ok = check.errors.length === 0
  return (
    <div>
      <div className="adm-card">
        <h3>Status: <StatusBadge status={status} /></h3>
        <p className="adm-note">
          Last updated: {when(st.m.updated_at)} by {who(st.m.updated_by)}.
          {meta.lastEdit && <> Lesson content last edited: {when(meta.lastEdit.edited_at)} by {who(meta.lastEdit.edited_by)}.</>}
          {st.m.published_at && <> First published: {when(st.m.published_at)}.</>}
        </p>
        {dirty && <p className="adm-warn">You have unsaved changes. Publishing saves them first.</p>}
        <div className="adm-actions">
          {status !== 'published' && <button className="adm-btn ghost" disabled={busy} onClick={actions.save}>Save Draft</button>}
          {(status === 'draft' || status === 'archived') && <button className="adm-btn ghost" disabled={busy} onClick={actions.review}>Submit for review</button>}
          {status !== 'published' && status !== 'archived' && (
            <button className="adm-btn" disabled={busy || !ok} onClick={actions.publish} title={ok ? '' : 'Fix the problems below first'}>Publish</button>
          )}
          {status === 'published' && <button className="adm-btn danger" disabled={busy} onClick={actions.unpublish}>Unpublish (back to Draft)</button>}
          {status !== 'archived' && status !== 'published' && <button className="adm-btn ghost" disabled={busy} onClick={actions.archive}>Archive</button>}
          {status === 'archived' && <button className="adm-btn ghost" disabled={busy} onClick={actions.restore}>Restore as Draft</button>}
        </div>
        {status === 'published' && <p className="adm-note">A published mission is locked so a child never sees half-finished work. Unpublish it to edit, then publish again.</p>}
      </div>

      <div className="adm-card">
        <h3>Before publishing</h3>
        {ok ? <p className="adm-good">✅ Everything essential is complete in Hausa and English.</p> : <p className="adm-err">❌ {check.errors.length} problem(s) must be fixed:</p>}
        <ul>{check.errors.map((e, i) => <li key={i} className="adm-err">{e}</li>)}</ul>
        {check.warnings.length > 0 && <><p className="adm-warn">⚠ Suggestions (you can still publish):</p><ul>{check.warnings.map((w, i) => <li key={i} className="adm-warn">{w}</li>)}</ul></>}
      </div>

      <div className="adm-card">
        <h3>All learning steps</h3>
        <ol className="adm-outline">
          {st.teach.map((b) => <li key={b.uid}>{typeInfo(b.type).emoji} {typeInfo(b.type).name}: {b.content.title.en || b.content.title.ha || '(untitled)'}</li>)}
          {st.procs.map((b) => <li key={b.uid}>{typeInfo(b.type).emoji} {typeInfo(b.type).name}: {b.content.name.en || b.content.name.ha || '(unnamed)'} ({b.content.items.length} steps)</li>)}
          {st.chals.map((b) => <li key={b.uid}>{typeInfo(b.type).emoji} {typeInfo(b.type).name}</li>)}
          {st.quiz.map((b) => <li key={b.uid}>❓ {b.content.question.en || b.content.question.ha || '(new question)'}</li>)}
          <li>🏆 Reward</li>
        </ol>
      </div>
    </div>
  )
}
