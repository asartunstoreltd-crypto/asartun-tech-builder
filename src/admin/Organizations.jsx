import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Confirm, Field } from './ui.jsx'
import { OrgClasses, OrgInsights, OrgLearners } from './orgparts.jsx'
import { createOrg, deleteOrg, entitlements, getOrg, grantPremium, listOrgs, regenCode, revokePremium, updateOrg } from './api2.js'
import { StaffForm, StaffList } from './StaffAccounts.jsx'

const TYPES = [['school', 'School'], ['company', 'Company'], ['ngo', 'NGO'], ['other', 'Other']]

export function OrganizationList() {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)
  const [f, setF] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { listOrgs().then(setRows).catch((e) => setErr(e.message)) }, [])
  const create = async () => {
    try { const id = await createOrg({ name: f.name.trim(), org_type: f.type, max_learners: f.max ? Number(f.max) : null, consent_confirmed: f.consent, consent_note: f.note || null }); nav(`/admin/organizations/${id}`) } catch (e) { setErr(e.message) }
  }
  return (
    <>
      <div className="adm-head"><h2>Schools &amp; companies</h2>
        <button className="adm-btn" onClick={() => setF({ name: '', type: 'school', max: '', consent: false, note: '' })}>+ New organization</button></div>
      {err && <p className="adm-err">{err}</p>}
      {rows && rows.map((o) => (
        <div className="adm-card" key={o.id}>
          <Link to={`/admin/organizations/${o.id}`}><b>{o.name}</b></Link> <span className="adm-badge">{o.org_type}</span>{' '}
          <span className={'adm-badge ' + (o.status === 'active' ? 's-published' : 's-draft')}>{o.status}</span>
          {!o.consent_confirmed && <span className="adm-warn"> ⚠ consent not confirmed: children cannot join yet</span>}
        </div>))}
      {rows && rows.length === 0 && <p className="adm-empty">No organizations yet.</p>}
      {f && (
        <div className="adm-modal"><div className="adm-card">
          <h3>New school or company</h3>
          <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="adm-two">
            <Field label="Type"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Field>
            <Field label="Maximum learners (optional)"><input type="number" min="1" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
          </div>
          <label className="adm-chk"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> The organization confirmed in writing that it has parent/guardian permission for its learners to be seen by its staff</label>
          <Field label="Consent note (contract date, reference)"><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <div className="adm-actions"><button className="adm-btn" disabled={f.name.trim().length < 2} onClick={create}>Create</button><button className="adm-btn ghost" onClick={() => setF(null)}>Cancel</button></div>
        </div></div>
      )}
    </>
  )
}

export function OrganizationDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [o, setO] = useState(null)
  const [tab, setTab] = useState('learners')
  const [sk, setSk] = useState(0)
  const [ents, setEnts] = useState([])
  const [days, setDays] = useState(365)
  const [msg, setMsg] = useState(null)
  const [del, setDel] = useState(false)
  const load = useCallback(async () => {
    try {
      const [org, en] = await Promise.all([getOrg(id), entitlements()])
      setO(org); setEnts(en.filter((e) => e.org_id === id))
    } catch (e) { setMsg({ err: e.message }) }
  }, [id])
  useEffect(() => { load() }, [load])
  if (!o) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const go = (fn, ok) => async () => { setMsg(null); try { await fn(); await load(); if (ok) setMsg({ ok }) } catch (e) { setMsg({ err: e.message }) } }
  const set = (p) => setO({ ...o, ...p })
  const save = go(() => updateOrg(id, { name: o.name, org_type: o.org_type, status: o.status, consent_confirmed: o.consent_confirmed, consent_note: o.consent_note, max_learners: o.max_learners || null }), 'Saved.')
  const active = ents.find((e) => e.active)
  return (
    <>
      <Link to="/admin/organizations">← All organizations</Link>
      <h2>{o.name}</h2>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      <div className="adm-tabs">{[['learners', 'Learners'], ['report', 'Where they struggle'], ['classes', 'Classes'], ['staff', 'Staff'], ['premium', 'Premium'], ['settings', 'Settings']]
        .map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'learners' && <OrgLearners orgId={id} orgName={o.name} />}
      {tab === 'report' && <OrgInsights orgId={id} />}
      {tab === 'classes' && <OrgClasses orgId={id} canEdit />}
      {tab === 'staff' && (
        <>
          <StaffForm orgs={[o]} orgId={id} onDone={() => setSk(sk + 1)} />
          <StaffList key={sk} orgId={id} />
        </>
      )}
      {tab === 'premium' && (
        <div className="adm-card">
          <p>{active ? <>⭐ Premium is <b>active</b> until {active.ends_at ? new Date(active.ends_at).toLocaleDateString() : 'no end date'}. All learners in this organization can open premium missions.</> : 'No active premium.'}</p>
          <Field label="Give premium to the whole organization for (days)"><input type="number" min="1" max="3650" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
          <button className="adm-btn" onClick={go(() => grantPremium(null, id, new Date(Date.now() + days * 86400000).toISOString(), 'Organization plan'), 'Premium given.')}>Give premium</button>
          {ents.filter((e) => e.active).map((e) => <p key={e.id}>Until {e.ends_at ? new Date(e.ends_at).toLocaleDateString() : '–'} <button className="adm-btn ghost" onClick={go(() => revokePremium(e.id), 'Premium ended.')}>End now</button></p>)}
        </div>
      )}
      {tab === 'settings' && (
        <div className="adm-card">
          <Field label="Name"><input value={o.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <div className="adm-two">
            <Field label="Type"><select value={o.org_type} onChange={(e) => set({ org_type: e.target.value })}>{TYPES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Field>
            <Field label="Status"><select value={o.status} onChange={(e) => set({ status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended (codes stop working, staff lose access to learners)</option></select></Field>
            <Field label="Maximum learners"><input type="number" min="1" value={o.max_learners || ''} onChange={(e) => set({ max_learners: e.target.value })} /></Field>
          </div>
          <label className="adm-chk"><input type="checkbox" checked={o.consent_confirmed} onChange={(e) => set({ consent_confirmed: e.target.checked })} /> Parent/guardian permission confirmed by the organization (children can join only when ticked)</label>
          <Field label="Consent note"><input value={o.consent_note || ''} onChange={(e) => set({ consent_note: e.target.value })} /></Field>
          <p>Organization code: <code className="adm-code">{o.join_code}</code> <button className="adm-btn ghost" onClick={go(async () => { await regenCode(id) }, 'New code created. The old code no longer works.')}>New code</button></p>
          <div className="adm-actions"><button className="adm-btn" onClick={save}>Save</button><button className="adm-btn danger" onClick={() => setDel(true)}>Delete organization</button></div>
        </div>
      )}
      {del && <Confirm title="Delete this organization?" phrase={o.name} yesText="Delete" onNo={() => setDel(false)}
        onYes={go(async () => { await deleteOrg(id); nav('/admin/organizations') })}><p>Classes, staff access and memberships are removed. Learners’ own progress stays.</p></Confirm>}
    </>
  )
}
