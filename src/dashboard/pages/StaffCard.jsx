import { ROLE_LABEL, displayName, formatDate, learnerCount, plural, totalLearners } from '../staffModel.js'

// One staff member. Presentational: every number shown comes from the `staff` object the database returned.
export default function StaffCard({ staff: s, isSelf = false, onAssign, onMove, onRemove, onSuspend, onReactivate, onDetails, onEdit }) {
  const isTeacher = s.role === 'facilitator'
  const classes = s.classes || []
  return (
    <article className={'dash-card staff' + (s.active ? '' : ' suspended')} aria-label={displayName(s)}>
      <header className="staff-head">
        <div>
          <h3>{displayName(s)}{isSelf && <span className="dash-muted"> (you)</span>}</h3>
          <p className="dash-muted">{ROLE_LABEL[s.role] || s.role}</p>
        </div>
        <span className={'dash-badge ' + (s.active ? 'good' : 'bad')}>{s.active ? 'Active' : 'Suspended'}</span>
      </header>
      <dl className="staff-facts">
        <div><dt>Phone</dt><dd>{s.phone || '—'}</dd></div>
        <div><dt>Email</dt><dd>{s.email || '—'}</dd></div>
        <div><dt>Joined</dt><dd>{formatDate(s.created_at)}</dd></div>
      </dl>
      {isTeacher ? (
        <section aria-label="Assigned classes">
          <h4>{plural(classes.length, 'class', 'classes')}{classes.length > 0 && <span className="dash-muted"> · {learnerCount(totalLearners(s))} in total</span>}</h4>
          {classes.length === 0 ? <p className="dash-muted">No class assigned yet.</p> : (
            <ul className="staff-classes">
              {classes.map((c) => (
                <li key={c.id}>
                  <div className="cls">
                    <strong>{c.name}</strong>{c.status !== 'active' && <span className="dash-badge">closed</span>}
                    <span className="dash-count">{learnerCount(c.learners)}</span>
                  </div>
                  <div className="dash-actions">
                    <button type="button" className="dash-link" onClick={() => onMove(s, c)} disabled={!s.active}>Move</button>
                    <button type="button" className="dash-link danger" onClick={() => onRemove(s, c)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : <p className="dash-muted">Adult Admins can open every class, so classes are not assigned to them.</p>}
      <footer className="dash-actions wrap">
        <button type="button" className="dash-btn ghost" onClick={() => onDetails(s)}>Details</button>
        <button type="button" className="dash-btn ghost" onClick={() => onEdit(s)}>Edit</button>
        {isTeacher && <button type="button" className="dash-btn ghost" onClick={() => onAssign(s)} disabled={!s.active}>Assign class</button>}
        {!isSelf && (s.active
          ? <button type="button" className="dash-btn danger-ghost" onClick={() => onSuspend(s)}>Suspend</button>
          : <button type="button" className="dash-btn primary" onClick={() => onReactivate(s)}>Reactivate</button>)}
      </footer>
    </article>
  )
}
