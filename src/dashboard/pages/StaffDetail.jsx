import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog.jsx'
import { friendly, staffActivity, staffSubmissions } from '../dashApi.js'
import { ROLE_LABEL, displayName, formatDate, learnerCount } from '../staffModel.js'

const ACTION = { view_learner: 'Viewed a learner', create_learner: 'Created a learner', reset_pin: 'Reset a PIN', add_member: 'Added a learner to a class', remove_member: 'Removed a learner from a class',
  create_class: 'Created a class', review_submission: 'Reviewed a submission', create_assignment: 'Created an assignment', close_class: 'Closed a class', assign_class: 'Was assigned a class',
  unassign_class: 'Was removed from a class', reassign_class: 'Was moved to another class', mark_attendance: 'Marked attendance', open_session: 'Opened a session' }
const label = (a) => ACTION[a] || a.replace(/_/g, ' ')
const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }

export default function StaffDetail({ staff: s, onClose }) {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({})                                // { activity, submissions }
  const [state, setState] = useState({ loading: false, error: '' })
  useEffect(() => {
    const key = tab === 'activity' ? 'activity' : tab === 'work' ? 'submissions' : null
    if (!key || data[key]) return undefined
    let live = true
    setState({ loading: true, error: '' })
    ;(key === 'activity' ? staffActivity : staffSubmissions)(s.user_id)
      .then((d) => { if (live) { setData((x) => ({ ...x, [key]: d })); setState({ loading: false, error: '' }) } })
      .catch((e) => { if (live) setState({ loading: false, error: friendly(e) }) })
    return () => { live = false }
  }, [tab, s.user_id])                                              // eslint-disable-line react-hooks/exhaustive-deps
  const a = data.activity; const w = data.submissions
  return (
    <Dialog title={displayName(s)} onClose={onClose} wide footer={<button type="button" className="dash-btn ghost" onClick={onClose}>Close</button>}>
      <div className="dash-tabs" role="tablist">
        {[['overview', 'Overview'], ['activity', 'Activity'], ['work', 'Submissions']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>))}
      </div>
      {state.loading && <p className="dash-muted">Loading…</p>}
      {state.error && <p className="dash-err" role="alert">{state.error}</p>}
      {tab === 'overview' && (
        <dl className="staff-facts big">
          <div><dt>Role</dt><dd>{ROLE_LABEL[s.role] || s.role}</dd></div>
          <div><dt>Status</dt><dd>{s.active ? 'Active' : 'Suspended' + (s.suspended_at ? ' since ' + formatDate(s.suspended_at) : '')}</dd></div>
          <div><dt>Phone</dt><dd>{s.phone || '—'}</dd></div>
          <div><dt>Email</dt><dd>{s.email}</dd></div>
          <div><dt>Joined</dt><dd>{formatDate(s.created_at)}</dd></div>
          <div><dt>Last sign-in</dt><dd>{s.last_sign_in_at ? when(s.last_sign_in_at) : 'Never'}</dd></div>
          <div className="full"><dt>Classes</dt><dd>{(s.classes || []).length === 0 ? 'None' : <ul className="staff-classes">{s.classes.map((c) => <li key={c.id}><strong>{c.name}</strong><span className="dash-count">{learnerCount(c.learners)}</span><span className="dash-muted">{c.assigned_at ? 'since ' + formatDate(c.assigned_at) : 'assigned before tracking began'}</span></li>)}</ul>}</dd></div>
        </dl>)}
      {tab === 'activity' && a && (
        <>
          <p className="dash-muted">Last 30 days</p>
          {Object.keys(a.summary || {}).length === 0 ? <p>No recorded activity in the last 30 days.</p> : <ul className="dash-chips">{Object.entries(a.summary).map(([k, n]) => <li key={k}>{label(k)} <b>{n}</b></li>)}</ul>}
          {(a.recent || []).length > 0 && <ul className="dash-feed">{a.recent.map((r, i) => <li key={i}><span>{label(r.action)}{r.learner_name ? ' — ' + r.learner_name : ''}{r.class_name ? ' (' + r.class_name + ')' : ''}</span><time>{when(r.at)}</time></li>)}</ul>}
        </>)}
      {tab === 'work' && w && (
        <>
          <p><b>{w.reviewed_total}</b> reviewed in total · <b>{w.waiting}</b> waiting in their classes</p>
          {(w.recent || []).length === 0 ? <p>This teacher has not reviewed any submissions yet.</p> : <ul className="dash-feed">{w.recent.map((r) => (
            <li key={r.id}><span>{r.learner_name} — {r.assignment} <span className="dash-muted">({r.class_name})</span>{r.redo ? ' · redo requested' : ''}</span>
              <time>{r.score != null ? r.score + '/' + r.max_score + ' · ' : ''}{when(r.reviewed_at)}</time></li>))}</ul>}
        </>)}
    </Dialog>
  )
}
