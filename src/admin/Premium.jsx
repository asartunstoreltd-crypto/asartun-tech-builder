import { useCallback, useEffect, useState } from 'react'
import { Bi, Confirm, Field } from './ui.jsx'
import { blank } from './api.js'
import { createCodes, decidePayment, deletePlan, downloadCsv, entitlements, getPayInfo, groupCode, listAccess, listCodes, listPlans, paymentRequests, revokeCode, revokePremium, savePayInfo, savePlan, setAccess } from './api2.js'

const when = (t) => (t ? new Date(t).toLocaleString() : '–')
const title = (m) => (m.title && (m.title.en || m.title.ha)) || m.slug

// ---------- 1. Lock the app ----------
function LockTab() {
  const [rows, setRows] = useState(null)
  const [free, setFree] = useState(new Set())
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => listAccess().then((r) => { setRows(r); setFree(new Set(r.filter((m) => m.access === 'free').map((m) => m.slug))) }).catch((e) => setMsg({ err: e.message })), [])
  useEffect(() => { load() }, [load])
  if (!rows) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const toggle = (slug) => setFree((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else n.add(slug); return n })
  const save = async (list, ok) => { setMsg(null); try { const r = await setAccess([...list]); await load(); setMsg({ ok: `${ok} Free: ${r.free}, Premium (locked until paid): ${r.premium}.` }) } catch (e) { setMsg({ err: e.message }) } }
  const premiumCount = rows.filter((m) => !free.has(m.slug)).length
  return (
    <>
      <div className="adm-card">
        <h3>Lock the app</h3>
        <p className="adm-note">Tick the missions that stay <b>free</b> (a free trial). Every mission you leave unticked becomes <b>⭐ Premium</b>: children see a lock and must pay (or use an activation code) before it opens. Learners who already have premium are not affected.</p>
        <div className="adm-actions">
          <button className="adm-btn danger" onClick={() => save([], '🔒 The whole app is locked.')}>🔒 Lock everything</button>
          <button className="adm-btn ghost" onClick={() => save(rows.map((m) => m.slug), '🔓 The whole app is open.')}>🔓 Open everything</button>
          <button className="adm-btn" onClick={() => save(free, 'Saved.')}>Save my choice ({rows.length - premiumCount} free, {premiumCount} premium)</button>
        </div>
        {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      </div>
      <div className="adm-tablewrap"><table className="adm-table">
        <thead><tr><th>Free?</th><th>Mission</th><th>Status</th><th>Now</th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.slug}><td><input type="checkbox" checked={free.has(m.slug)} onChange={() => toggle(m.slug)} /></td>
            <td>{m.mission_no ? `${m.mission_no}. ` : ''}{title(m)}</td><td>{m.status}</td><td>{m.access === 'premium' ? '⭐ Premium' : 'Free'}</td></tr>))}</tbody>
      </table></div>
      <p className="adm-note">You can also switch a single mission in Missions → edit → Details → “Who can open this mission?”.</p>
    </>
  )
}

// ---------- 2. Plans & payment instructions ----------
function PlansTab() {
  const [plans, setPlans] = useState(null)
  const [info, setInfo] = useState(null)
  const [msg, setMsg] = useState(null)
  const load = useCallback(async () => { try { const [p, i] = await Promise.all([listPlans(), getPayInfo()]); setPlans(p); setInfo(i) } catch (e) { setMsg({ err: e.message }) } }, [])
  useEffect(() => { load() }, [load])
  if (!plans || !info) return msg ? <p className="adm-err">{msg.err}</p> : <p>Loading…</p>
  const run = (fn, ok) => async () => { setMsg(null); try { await fn(); await load(); setMsg({ ok }) } catch (e) { setMsg({ err: e.message }) } }
  const edit = (i, p) => setPlans(plans.map((x, n) => (n === i ? { ...x, ...p } : x)))
  return (
    <>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      <div className="adm-card">
        <h3>How children pay (shown on the unlock screen)</h3>
        <Bi label="Instructions" rows={3} value={info.instructions} onChange={(v) => setInfo({ ...info, instructions: v })} />
        <Field label="Account details (bank, account name, number: shown exactly as typed)"><textarea rows={4} value={info.account_details} onChange={(e) => setInfo({ ...info, account_details: e.target.value })} /></Field>
        <Field label="WhatsApp number with country code (e.g. 2348012345678), optional"><input value={info.whatsapp} onChange={(e) => setInfo({ ...info, whatsapp: e.target.value })} /></Field>
        <button className="adm-btn" onClick={run(() => savePayInfo(info), 'Payment details saved.')}>Save payment details</button>
      </div>
      <h3>Plans</h3>
      {plans.map((p, i) => (
        <div className="adm-card" key={p.id || 'new' + i}>
          <Bi label="Plan name" value={p.name} onChange={(v) => edit(i, { name: v })} />
          <div className="adm-two">
            <Field label="Days of premium"><input type="number" min="1" value={p.days} onChange={(e) => edit(i, { days: e.target.value })} /></Field>
            <Field label="Price (₦)"><input type="number" min="0" value={p.price_ngn} onChange={(e) => edit(i, { price_ngn: e.target.value })} /></Field>
          </div>
          <label className="adm-chk"><input type="checkbox" checked={p.active} onChange={(e) => edit(i, { active: e.target.checked })} /> Shown to children (switch on when the price is set)</label>
          <div className="adm-actions">
            <button className="adm-btn" onClick={run(() => savePlan(p), 'Plan saved.')}>Save plan</button>
            {p.id && <button className="adm-btn danger" onClick={() => { if (window.confirm('Delete this plan?')) run(() => deletePlan(p.id), 'Plan deleted.')() }}>Delete</button>}
          </div>
        </div>))}
      <button className="adm-btn ghost" onClick={() => setPlans([...plans, { name: blank(), days: 30, price_ngn: 0, active: false, position: plans.length + 1 }])}>+ Add plan</button>
    </>
  )
}

// ---------- 3. Payment requests ----------
function RequestsTab() {
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState(null)
  const [ask, setAsk] = useState(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => paymentRequests(status).then(setRows).catch((e) => setMsg({ err: e.message })), [status])
  useEffect(() => { setRows(null); load() }, [load])
  const decide = async () => {
    const a = ask; setAsk(null); setMsg(null)
    try { await decidePayment(a.r.id, a.approve, note); setNote(''); await load(); setMsg({ ok: a.approve ? 'Approved: premium is now active for the learner.' : 'Rejected.' }) } catch (e) { setMsg({ err: e.message }) }
  }
  return (
    <>
      <div className="adm-actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Waiting</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option></select>
        <button className="adm-btn ghost" onClick={load}>Refresh</button>
      </div>
      <p className="adm-note">First check the money arrived in your account / wallet and matches the reference. Only then press Approve. Approving gives the learner the plan’s days of premium at once (added after any premium they still have).</p>
      {msg && <p className={msg.err ? 'adm-err' : 'adm-good'}>{msg.err || msg.ok}</p>}
      {!rows ? <p>Loading…</p> : rows.map((r) => (
        <div className="adm-card" key={r.id}>
          <b>{r.nickname || 'learner'}</b> · {(r.plan_name && (r.plan_name.en || r.plan_name.ha)) || ''} · {r.plan_days} days · <b>₦{Number(r.amount_ngn).toLocaleString()}</b><br />
          <span>Reference: <code className="adm-code">{r.reference}</code></span>{r.contact && <span> · Contact: {r.contact}</span>}<br />
          <small className="adm-note">{when(r.created_at)} · {r.status}{r.decided_at ? ' ' + when(r.decided_at) : ''}{r.admin_note ? ' · ' + r.admin_note : ''}</small>
          {r.status === 'pending' && <div className="adm-actions"><button className="adm-btn" onClick={() => setAsk({ r, approve: true })}>Approve</button><button className="adm-btn danger" onClick={() => setAsk({ r, approve: false })}>Reject</button></div>}
        </div>))}
      {rows && rows.length === 0 && <p className="adm-empty">Nothing here.</p>}
      {ask && (
        <Confirm title={ask.approve ? 'Approve this payment?' : 'Reject this request?'} yesText={ask.approve ? 'Approve' : 'Reject'} danger={!ask.approve} onNo={() => setAsk(null)} onYes={decide}>
          <p>{ask.r.nickname} · ₦{Number(ask.r.amount_ngn).toLocaleString()} · {ask.r.plan_days} days · ref <b>{ask.r.reference}</b></p>
          <Field label={ask.approve ? 'Note (optional)' : 'Reason shown to the learner (optional)'}><input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></Field>
        </Confirm>)}
    </>
  )
}

// ---------- 4. Activation codes ----------
function CodesTab() {
  const [rows, setRows] = useState(null)
  const [days, setDays] = useState(30)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [fresh, setFresh] = useState(null)
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => listCodes().then(setRows).catch((e) => setMsg({ err: e.message })), [])
  useEffect(() => { load() }, [load])
  const make = async () => { setMsg(null); try { const r = await createCodes(Number(days), Number(count), note); setFresh(r.map((x) => x.code)); await load() } catch (e) { setMsg({ err: e.message }) } }
  const revoke = async (id) => { if (window.confirm('Cancel this unused code?')) { try { await revokeCode(id); load() } catch (e) { setMsg({ err: e.message }) } } }
  const copy = () => { try { navigator.clipboard.writeText(fresh.map(groupCode).join('\n')) } catch { /* ignore */ } }
  return (
    <>
      <div className="adm-card">
        <h3>Make activation codes</h3>
        <p className="adm-note">Use after you receive payment (cash, transfer, agent). Send the code to the family; they type it in the app. A code works once.</p>
        <div className="adm-two">
          <Field label="Days of premium"><input type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
          <Field label="How many codes (1–200)"><input type="number" min="1" max="200" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
        </div>
        <Field label="Note (e.g. “Aisha, paid cash 5 Nov”)"><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="adm-btn" onClick={make}>Create code(s)</button>
        {msg && <p className="adm-err">{msg.err}</p>}
      </div>
      {fresh && (
        <div className="adm-card"><h3>New codes (copy them now)</h3>
          {fresh.map((c) => <p key={c}><code className="adm-code">{groupCode(c)}</code></p>)}
          <div className="adm-actions"><button className="adm-btn" onClick={copy}>Copy all</button><button className="adm-btn ghost" onClick={() => setFresh(null)}>Close</button></div></div>)}
      {!rows ? <p>Loading…</p> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Code</th><th>Days</th><th>Note</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}><td><code>{groupCode(c.code)}</code></td><td>{c.days}</td><td>{c.note || ''}</td>
              <td>{c.redeemed_at ? `Used by ${c.redeemed_by_nickname || 'learner'} · ${when(c.redeemed_at)}` : c.active ? 'Unused' : 'Cancelled'}</td>
              <td>{!c.redeemed_at && c.active && <button className="adm-btn ghost" onClick={() => revoke(c.id)}>Cancel</button>}</td></tr>))}</tbody>
        </table></div>)}
      {rows && rows.length > 0 && <button className="adm-btn ghost" onClick={() => downloadCsv('activation-codes.csv', [['Code', 'Days', 'Note', 'Status'], ...rows.map((c) => [groupCode(c.code), c.days, c.note, c.redeemed_at ? 'used' : c.active ? 'unused' : 'cancelled'])])}>Download CSV</button>}
    </>
  )
}

// ---------- 5. Who has premium now ----------
function ActiveTab() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => entitlements().then(setRows).catch((e) => setErr(e.message)), [])
  useEffect(() => { load() }, [load])
  const end = async (id) => { if (window.confirm('End this premium now? The learner loses access to premium lessons.')) { try { await revokePremium(id); load() } catch (e) { setErr(e.message) } } }
  return (
    <>
      <p className="adm-note">Give premium by hand from a learner (Learners → click → Give premium) or an organization. End it here at any time.</p>
      {err && <p className="adm-err">{err}</p>}
      {!rows ? <p>Loading…</p> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Who</th><th>Type</th><th>Source</th><th>From</th><th>Until</th><th>Note</th><th>Given by</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td><b>{r.who}</b></td><td>{r.kind}</td><td>{r.source}</td><td>{new Date(r.starts_at).toLocaleDateString()}</td>
              <td>{r.ends_at ? new Date(r.ends_at).toLocaleDateString() : 'no end'} {r.active ? '✅' : '⛔'}</td><td>{r.note || ''}</td><td>{r.granted_by_email || ''}</td>
              <td>{r.active && <button className="adm-btn ghost" onClick={() => end(r.id)}>End now</button>}</td></tr>))}</tbody>
        </table></div>)}
      {rows && rows.length === 0 && <p className="adm-empty">No premium given yet.</p>}
    </>
  )
}

const TABS = [['lock', '🔒 Lock the app'], ['requests', '💳 Payment requests'], ['codes', '🎟️ Activation codes'], ['plans', '💰 Plans & how to pay'], ['active', '⭐ Who has premium']]

export default function Premium() {
  const [tab, setTab] = useState('lock')
  const [pending, setPending] = useState(0)
  useEffect(() => { paymentRequests('pending').then((r) => setPending(r.length)).catch(() => {}) }, [tab])
  return (
    <>
      <h2>Premium &amp; payments</h2>
      <p className="adm-note">Payments are manual for now: the family pays outside the app (bank transfer, cash, mobile money), then you approve their request or give them an activation code. Online payment (Paystack / Flutterwave) can be added later.</p>
      <div className="adm-tabs">{TABS.map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}{k === 'requests' && pending > 0 ? ` (${pending})` : ''}</button>)}</div>
      {tab === 'lock' && <LockTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'active' && <ActiveTab />}
    </>
  )
}
