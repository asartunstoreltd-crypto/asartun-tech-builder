import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Confirm, Field } from './ui.jsx'
import { allStaff, createStaff, resetStaffPassword } from './staffApi.js'
import { listOrgs, removeStaff } from './api2.js'

const ROLES = [['teacher', 'Teacher / staff (can view results)'], ['org_admin', 'Organization admin (view + classes + codes)']]

// Shown ONCE after an account is created or a password is reset.
function Credentials({ info, onClose }) {
  const url = `${window.location.origin}/org/login`
  const text = [
    `Sannu! An ƙirƙiri maka asusu a ASARTUN TECH BUILDER${info.org ? ' (' + info.org + ')' : ''}.`,
    `Shafi: ${url}`, `Imel: ${info.email}`, `Kalmar sirri: ${info.password}`,
    'Bayan ka shiga, ka danna “Change password” ka canza kalmar sirri.', '',
    `Hello! An account was created for you on ASARTUN TECH BUILDER${info.org ? ' (' + info.org + ')' : ''}.`,
    `Page: ${url}`, `Email: ${info.email}`, `Password: ${info.password}`,
    'After you sign in, click “Change password” and choose your own.',
  ].join('\n')
  const [copied, setCopied] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text).then(() => setCopied(true)) } catch { /* ignore */ } }
  return (
    <div className="adm-modal"><div className="adm-card">
      <h3>{info.created === false ? 'Existing account added' : 'Account ready'}</h3>
      <p>Email: <b>{info.email}</b></p>
      {info.password
        ? <><p>Password: <code className="adm-code">{info.password}</code></p>
          <p className="adm-warn">⚠ This password is shown only once. Send it privately (WhatsApp / SMS), then ask them to change it.</p>
          <textarea readOnly rows={9} value={text} />
          <div className="adm-actions"><button className="adm-btn" onClick={copy}>{copied ? '✅ Copied' : 'Copy message'}</button><button className="adm-btn ghost" onClick={onClose}>Close</button></div></>
        : <><p className="adm-note">This email already had a login, so its password was not changed. Use “Reset password” in the list if they forgot it.</p>
          <div className="adm-actions"><button className="adm-btn ghost" onClick={onClose}>Close</button></div></>}
    </div></div>
  )
}

export function StaffForm({ orgs, orgId, onDone }) {
  const [org, setOrg] = useState(orgId || '')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('teacher')
  const [own, setOwn] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState(null)
  const target = orgId || org
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await createStaff(target, email.trim(), role, own ? pw : '')
      setInfo(r); setEmail(''); setPw(''); if (onDone) onDone()
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  return (
    <form className="adm-card" onSubmit={submit}>
      <h3>+ Create staff account</h3>
      <p className="adm-note">Creates the login and links it to the school or company. They sign in at <code>/org/login</code> and see only their own learners.</p>
      {!orgId && (
        <Field label="School or company">
          <select required value={org} onChange={(e) => setOrg(e.target.value)}>
            <option value="">Choose…</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      )}
      <div className="adm-two">
        <Field label="Staff email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.com" /></Field>
        <Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Field>
      </div>
      <label className="adm-chk"><input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> I will choose the password myself (otherwise a strong one is made for you)</label>
      {own && <Field label="Password (at least 10 characters)"><input type="text" minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>}
      {err && <p className="adm-err" role="alert">{err}</p>}
      <button className="adm-btn" disabled={busy || !target || !email || (own && pw.length < 10)}>{busy ? 'Creating…' : 'Create account'}</button>
      {info && <Credentials info={info} onClose={() => setInfo(null)} />}
    </form>
  )
}

export function StaffList({ orgId }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const load = useCallback(() => allStaff().then((r) => setRows(orgId ? r.filter((x) => x.org_id === orgId) : r)).catch((e) => setErr(e.message)), [orgId])
  useEffect(() => { load() }, [load])
  const reset = async (s) => { setConfirm(null); setErr(''); try { setInfo({ ...(await resetStaffPassword(s.user_id)), org: s.org_name }) } catch (e) { setErr(e.message) } }
  const remove = async (s) => { setConfirm(null); try { await removeStaff(s.id); load() } catch (e) { setErr(e.message) } }
  if (!rows) return err ? <p className="adm-err">{err}</p> : <p>Loading…</p>
  return (
    <>
      {err && <p className="adm-err">{err}</p>}
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr>{!orgId && <th>School / company</th>}<th>Email</th><th>Role</th><th>Last sign-in</th><th></th></tr></thead>
        <tbody>{rows.map((s) => (
          <tr key={s.id}>
            {!orgId && <td>{s.org_name}</td>}
            <td>{s.email}</td><td>{s.role === 'org_admin' ? 'Organization admin' : 'Teacher'}</td>
            <td>{s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : 'never signed in'}</td>
            <td className="adm-cellbtns">
              <button className="adm-btn ghost" onClick={() => setConfirm({ kind: 'reset', s })}>Reset password</button>
              <button className="adm-btn ghost" onClick={() => setConfirm({ kind: 'remove', s })}>Remove access</button>
            </td>
          </tr>))}</tbody>
      </table></div>
      {rows.length === 0 && <p className="adm-empty">No staff accounts yet.</p>}
      {confirm && confirm.kind === 'reset' && (
        <Confirm title="Reset password?" yesText="Reset" danger={false} onNo={() => setConfirm(null)} onYes={() => reset(confirm.s)}>
          <p>A new password is made for <b>{confirm.s.email}</b>. The old one stops working.</p></Confirm>)}
      {confirm && confirm.kind === 'remove' && (
        <Confirm title="Remove access?" yesText="Remove" onNo={() => setConfirm(null)} onYes={() => remove(confirm.s)}>
          <p><b>{confirm.s.email}</b> will no longer see {confirm.s.org_name}. The login itself stays; you can add them again later.</p></Confirm>)}
      {info && <Credentials info={info} onClose={() => setInfo(null)} />}
    </>
  )
}

export default function StaffAccounts() {
  const [orgs, setOrgs] = useState(null)
  const [k, setK] = useState(0)
  const [err, setErr] = useState('')
  useEffect(() => { listOrgs().then(setOrgs).catch((e) => setErr(e.message)) }, [])
  if (err) return <p className="adm-err">{err}</p>
  if (!orgs) return <p>Loading…</p>
  return (
    <>
      <h2>Staff accounts</h2>
      <p className="adm-note">Give a school or company its own page: create the organization first, then its staff accounts here.</p>
      {orgs.length === 0
        ? <div className="adm-card"><p>No school or company yet.</p><Link className="adm-btn" to="/admin/organizations">Create the first organization</Link></div>
        : <StaffForm orgs={orgs} onDone={() => setK(k + 1)} />}
      <h3>All staff accounts</h3>
      <StaffList key={k} />
    </>
  )
}
