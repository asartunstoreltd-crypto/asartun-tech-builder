import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { normalizePhone } from '../../adult/phone.js'
import { ConfirmDialog, Dialog } from '../Dialog.jsx'
import { useDash } from '../DashAuth.jsx'
import { useToast } from '../Toast.jsx'
import { assignClass, createTeacher, friendly, listClasses, listStaff, reassignClass, setStaffActive, setStaffProfile, unassignClass } from '../dashApi.js'
import { assignableClasses, displayName, filterStaff } from '../staffModel.js'
import StaffCard from './StaffCard.jsx'
import StaffDetail from './StaffDetail.jsx'

export default function StaffPage() {
  const { uid } = useDash()
  const toast = useToast()
  const [staff, setStaff] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all')
  const [dlg, setDlg] = useState(null)                                // { type, staff?, cls? }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [s, c] = await Promise.all([listStaff(), listClasses()]); setStaff(s); setClasses(c) }
    catch (e) { setError(friendly(e)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn, okText) => {
    setBusy(true)
    try { await fn(); toast.ok(okText); setDlg(null); await load() }
    catch (e) { const m = friendly(e); toast.fail(m); if (/Refreshing/.test(m)) { setDlg(null); load() } }
    finally { setBusy(false) }
  }

  const shown = useMemo(() => filterStaff(staff, { q, status }), [staff, q, status])
  const close = () => { if (!busy) setDlg(null) }
  const d = dlg || {}
  const nameOf = d.staff ? displayName(d.staff) : ''

  return (
    <section aria-busy={loading}>
      <div className="dash-toolbar">
        <input type="search" className="dash-input grow" placeholder="Search name, phone, email or class" aria-label="Search staff" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="dash-input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
        <button type="button" className="dash-btn ghost" onClick={load} disabled={loading} aria-label="Refresh staff list"><RefreshCw size={16} aria-hidden="true" /></button>
        <button type="button" className="dash-btn primary" onClick={() => setDlg({ type: 'add' })}><Plus size={16} aria-hidden="true" /> Add teacher</button>
      </div>

      {error && <div className="dash-card" role="alert"><p className="dash-err">{error}</p><button type="button" className="dash-btn" onClick={load}>Try again</button></div>}
      {loading && !staff && <p className="dash-muted">Loading staff…</p>}
      {staff && staff.length === 0 && !error && <div className="dash-card"><h2>No staff yet</h2><p>Add your first teacher to get started.</p></div>}
      {staff && staff.length > 0 && shown.length === 0 && <p className="dash-muted">No staff match your search.</p>}
      <div className="staff-grid">
        {shown.map((s) => (
          <StaffCard key={s.user_id} staff={s} isSelf={s.user_id === uid}
            onDetails={(x) => setDlg({ type: 'details', staff: x })} onEdit={(x) => setDlg({ type: 'edit', staff: x })}
            onAssign={(x) => setDlg({ type: 'assign', staff: x })} onMove={(x, c) => setDlg({ type: 'move', staff: x, cls: c })}
            onRemove={(x, c) => setDlg({ type: 'remove', staff: x, cls: c })}
            onSuspend={(x) => setDlg({ type: 'suspend', staff: x })} onReactivate={(x) => setDlg({ type: 'reactivate', staff: x })} />
        ))}
      </div>

      {d.type === 'details' && <StaffDetail staff={d.staff} onClose={close} />}
      {d.type === 'add' && <AddTeacher onClose={() => { setDlg(null); load() }} />}
      {d.type === 'edit' && <EditStaff staff={d.staff} busy={busy} onClose={close} onSave={(name, phone) => run(() => setStaffProfile(d.staff.user_id, name, phone), 'Details saved.')} />}
      {d.type === 'assign' && <PickClass title={`Assign a class to ${nameOf}`} options={assignableClasses(classes, d.staff)} busy={busy} onClose={close} confirmLabel="Assign class"
        onPick={(cid) => run(() => assignClass(d.staff.user_id, cid), 'Class assigned.')} />}
      {d.type === 'move' && <PickClass title={`Move ${nameOf} from “${d.cls.name}” to another class`} options={assignableClasses(classes, d.staff)} busy={busy} onClose={close} confirmLabel="Move teacher"
        note="The change takes effect immediately: the teacher loses access to the old class and gains the new one."
        onPick={(cid) => run(() => reassignClass(d.staff.user_id, d.cls.id, cid), 'Teacher moved.')} />}
      {d.type === 'remove' && <ConfirmDialog title="Remove class assignment?" danger confirmLabel="Remove assignment" busy={busy} onCancel={close}
        onConfirm={() => run(() => unassignClass(d.staff.user_id, d.cls.id), 'Assignment removed.')}>
        <p><b>{nameOf}</b> will immediately lose access to <b>{d.cls.name}</b> and its learners. The learners stay in the class.</p></ConfirmDialog>}
      {d.type === 'suspend' && <ConfirmDialog title="Suspend this account?" danger confirmLabel="Suspend" busy={busy} onCancel={close}
        onConfirm={() => run(() => setStaffActive(d.staff.user_id, false), 'Account suspended.')}>
        <p><b>{nameOf}</b> will immediately lose access to every class and learner. Class assignments are kept so you can reactivate later.</p></ConfirmDialog>}
      {d.type === 'reactivate' && <ConfirmDialog title="Reactivate this account?" confirmLabel="Reactivate" busy={busy} onCancel={close}
        onConfirm={() => run(() => setStaffActive(d.staff.user_id, true), 'Account reactivated.')}>
        <p><b>{nameOf}</b> will regain access to the classes still assigned to them.</p></ConfirmDialog>}
    </section>
  )
}

function PickClass({ title, options, busy, onClose, onPick, confirmLabel, note }) {
  const [cid, setCid] = useState('')
  return (
    <Dialog title={title} onClose={onClose} busy={busy} footer={<>
      <button type="button" className="dash-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className="dash-btn primary" disabled={!cid || busy} onClick={() => onPick(cid)}>{busy ? 'Working…' : confirmLabel}</button></>}>
      {options.length === 0 ? <p>There is no other active class to choose.</p> : (
        <label className="dash-field">Class
          <select className="dash-input" value={cid} onChange={(e) => setCid(e.target.value)} data-autofocus>
            <option value="">Choose a class…</option>{options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>)}
      {note && <p className="dash-muted">{note}</p>}
    </Dialog>
  )
}

function EditStaff({ staff, busy, onClose, onSave }) {
  const [name, setName] = useState(staff.full_name || ''); const [phone, setPhone] = useState(staff.phone || ''); const [err, setErr] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('Enter the name.')
    const p = phone.trim() ? normalizePhone(phone) : null
    if (phone.trim() && !p) return setErr('Enter a valid phone number, for example 0803 123 4567.')
    setErr(''); onSave(name.trim(), p)
  }
  return (
    <Dialog title="Edit staff details" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="dash-form">
        <label className="dash-field">Full name<input className="dash-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} data-autofocus /></label>
        <label className="dash-field">Phone<input className="dash-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" /></label>
        {err && <p className="dash-err" role="alert">{err}</p>}
        <div className="dash-actions end"><button type="button" className="dash-btn ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="dash-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Dialog>
  )
}

function AddTeacher({ onClose }) {
  const [f, setF] = useState({ name: '', phone: '', email: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null); const [copied, setCopied] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Enter the teacher’s name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr('Enter a valid email address.')
    const p = f.phone.trim() ? normalizePhone(f.phone) : null
    if (f.phone.trim() && !p) return setErr('Enter a valid phone number, for example 0803 123 4567.')
    setErr(''); setBusy(true)
    try { setDone(await createTeacher({ email: f.email, name: f.name.trim(), phone: p })) } catch (x) { setErr(friendly(x) === 'Something went wrong. Please try again.' ? x.message : friendly(x)) } finally { setBusy(false) }
  }
  if (done) return (
    <Dialog title="Teacher created" onClose={onClose}>
      <p>Give these sign-in details to <b>{done.email}</b>. The password is shown <b>once</b> and is not stored anywhere readable.</p>
      <p className="dash-secret" data-autofocus tabIndex={0}>{done.password}</p>
      {!done.profileSaved && <p className="dash-err" role="alert">The account exists, but the name and phone could not be saved. Use “Edit” on the new card to add them.</p>}
      <div className="dash-actions end">
        <button type="button" className="dash-btn ghost" onClick={() => { try { navigator.clipboard.writeText(done.password).then(() => setCopied(true)) } catch { /* ignore */ } }}>{copied ? 'Copied' : 'Copy password'}</button>
        <button type="button" className="dash-btn primary" onClick={onClose}>Done</button>
      </div>
    </Dialog>)
  return (
    <Dialog title="Add a teacher" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="dash-form">
        <label className="dash-field">Full name<input className="dash-input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-autofocus /></label>
        <label className="dash-field">Phone number<input className="dash-input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="080…" /></label>
        <label className="dash-field">Email (their sign-in name)<input className="dash-input" type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <p className="dash-muted">You can assign classes right after the account is created.</p>
        {err && <p className="dash-err" role="alert">{err}</p>}
        <div className="dash-actions end"><button type="button" className="dash-btn ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="dash-btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create teacher'}</button></div>
      </form>
    </Dialog>
  )
}
