import { useCallback, useEffect, useMemo, useState } from 'react'
import { staffApi } from '../adultApi.js'
import { useAdult } from '../AdultAuth.jsx'
import { lessonByKey } from '../courses.js'
import { AREAS, DAYS, T, attendanceStats, bySupport, classSummary, scheduleParts, scheduleProblem } from '../reports.js'

// Phase 7 facilitator screens: attendance, class and learner reports (printable), class schedule.
// The screen only arranges what the database returned. The database decides which classes a person may open
// (adult_can_manage_class); every judgement shown here comes from reports.js, where the rules are written down.

export const E = (t, code) => t({ network: 'errNetwork', denied: 'errDenied', CLASS_CLOSED: 'errClassClosed', BADDATE: 'errBadDate', BADSCHEDULE: 'errBadSchedule', BADMARKS: 'errBadMarks', TOOMANY: 'errTooMany', config: 'errConfig' }[code] || 'errGeneric')
const LEVEL_KEY = { none: 'lvNone', early: 'lvEarly', building: 'lvBuilding', developing: 'lvDeveloping', secure: 'lvSecure' }
const AREA_KEY = { read: 'skRead', write: 'skWrite', count: 'skCount', apply: 'skApply' }
export const STATUS_KEY = { support: 'statusSupport', watch: 'statusWatch', ok: 'statusOk', nodata: 'statusNodata' }
export const FLAG_KEY = { attLow: 'fAttLow', absentStreak: 'fAbsentStreak', inactive: 'fInactive', neverStarted: 'fNeverStarted', practice: 'fPractice', mathsLow: 'fMathsLow', choiceLow: 'fChoiceLow', workLow: 'fWorkLow', workOverdue: 'fWorkOverdue' }
const DAY_KEY = { 1: 'day1', 2: 'day2', 3: 'day3', 4: 'day4', 5: 'day5', 6: 'day6', 7: 'day7' }
const ATT_KEY = { present: 'attPresent', late: 'attLate', absent: 'attAbsent' }
const SCHED_ERR = { schedDays: 'schErrDays', schedTime: 'schErrTime', schedOrder: 'schErrOrder', sched: 'schErr' }
const MODE_KEY = { physical: 'modePhysical', online: 'modeOnline', both: 'modeBoth' }

const pad = (n) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const fmtDate = (v) => (v ? new Date(String(v).length === 10 ? v + 'T00:00:00' : v).toLocaleDateString() : '')
const pct = (x) => Math.round(x * 100)

// "Monday, Wednesday 16:00–17:30 · In person · Hall · note"
export function scheduleLine(t, c) {
  const p = scheduleParts(c.schedule)
  const parts = []
  if (p.days.length) parts.push(p.days.map((d) => t(DAY_KEY[d])).join(', ') + ' ' + p.start + '–' + p.end)
  parts.push(t(MODE_KEY[c.mode] || 'modePhysical'))
  if (c.location) parts.push(c.location)
  if (p.note) parts.push(p.note)
  return p.days.length || p.note || c.location ? parts.join(' · ') : ''
}

function useClassList() {
  const [list, setList] = useState(null)
  useEffect(() => { staffApi.classes().then(({ data }) => setList(data || [])) }, [])
  return list
}
function useReport(cls) {
  const { t } = useAdult()
  const [s, setS] = useState({ loading: true, data: null, err: '' })
  const load = useCallback(async () => {
    const { data, error } = await staffApi.reportData(cls)
    setS({ loading: false, data, err: error ? E(t, error) : '' })
  }, [cls, t])
  useEffect(() => { setS({ loading: true, data: null, err: '' }); load() }, [load])
  return { ...s, reload: load }
}
function ClassSelect({ classes, value, onChange }) {
  const { t } = useAdult()
  return <label>{t('attPickClass')}<select value={value} onChange={(e) => onChange(e.target.value)}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === 'closed' ? ' ' + t('admClosedClass') : ''}</option>)}</select></label>
}
function StatusTag({ status }) {
  const { t } = useAdult()
  return <span className={'ad-tag st-' + status}>{t(STATUS_KEY[status])}</span>
}

// ===================================================================================== attendance
export function AttendanceTab() {
  const { t } = useAdult()
  const classes = useClassList()
  const [cls, setCls] = useState('')
  useEffect(() => { if (!cls && classes && classes.length) setCls((classes.find((c) => c.status === 'active') || classes[0]).id) }, [classes, cls])
  if (!classes) return <p className="ad-note">{t('wait')}</p>
  if (!classes.length) return <p className="ad-note">{t('noClasses')}</p>
  return <section className="ad-stack"><ClassSelect classes={classes} value={cls} onChange={setCls} />{cls && <SessionPanel key={cls} cls={cls} />}</section>
}

function SessionPanel({ cls }) {
  const { t } = useAdult()
  const { loading, data, err, reload } = useReport(cls)
  const [date, setDate] = useState(today()); const [note, setNote] = useState('')
  const [sel, setSel] = useState(null); const [marks, setMarks] = useState({})
  const [msg, setMsg] = useState(''); const [e2, setE2] = useState(''); const [busy, setBusy] = useState(false); const [removing, setRemoving] = useState(false)
  const session = data ? data.sessions.find((s) => s.id === sel) : null
  const closed = data ? data.class.status !== 'active' : false
  // the marks already saved for the chosen session
  useEffect(() => {
    const m = {}
    if (data && sel) { const s = data.sessions.find((x) => x.id === sel); if (s) for (const l of data.learners) { const a = l.att.find((x) => x.d === s.d); if (a) m[l.id] = a.s } }
    setMarks(m)
  }, [data, sel])
  const open = async () => {
    setBusy(true); setE2(''); setMsg('')
    const { data: id, error } = await staffApi.openSession(cls, date, note)
    setBusy(false); if (error) return setE2(E(t, error))
    setNote(''); setSel(id); await reload()
  }
  const save = async () => {
    const list = Object.entries(marks).map(([learner, status]) => ({ learner, status }))
    if (!list.length) return
    setBusy(true); setE2(''); setMsg('')
    const { error } = await staffApi.markAttendance(sel, list)
    setBusy(false); if (error) return setE2(E(t, error))
    setMsg(t('attSaved')); reload()
  }
  const remove = async () => { setRemoving(false); const { error } = await staffApi.removeSession(sel); if (error) return setE2(E(t, error)); setSel(null); reload() }
  if (loading) return <p className="ad-note">{t('wait')}</p>
  if (err) return <p className="ad-error" role="alert">{err}</p>
  const counts = (d) => { let came = 0, marked = 0; for (const l of data.learners) { const a = l.att.find((x) => x.d === d); if (a) { marked++; if (a.s !== 'absent') came++ } } return { came, marked } }
  return (
    <>
      {closed && <p className="ad-banner">{t('attOnlyActive')}</p>}
      {!closed && (
        <div className="ad-card ad-noprint">
          <h3>{t('attOpen')}</h3>
          <label>{t('attDate')}<input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
          <label>{t('attNote')}<input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="ad-btn primary" disabled={busy || !date} onClick={open}>{t('attOpen')}</button>
        </div>)}
      {e2 && <p className="ad-error" role="alert">{e2}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      {session && (
        <div className="ad-card">
          <h3>{fmtDate(session.d)}{session.note ? ' · ' + session.note : ''}</h3>
          {data.learners.length === 0 ? <p className="ad-note">{t('attNoLearners')}</p> : (
            <>
              {!closed && <button className="ad-btn" onClick={() => setMarks(Object.fromEntries(data.learners.map((l) => [l.id, 'present'])))}>{t('attAllPresent')}</button>}
              <ul className="ad-list">
                {data.learners.map((l) => { const st = attendanceStats(l.att); return (
                  <li key={l.id} className="ad-roster">
                    <div><strong>{l.name}</strong><span className="ad-note">{st.rate == null ? t('attNoRecord') : t('attRate', { pct: pct(st.rate), came: st.attended, of: st.marked })}</span></div>
                    <div className="ad-seg" role="group" aria-label={l.name}>
                      {['present', 'late', 'absent'].map((s) => <button key={s} type="button" disabled={closed} aria-pressed={marks[l.id] === s} className={marks[l.id] === s ? 'on ' + s : ''} onClick={() => setMarks({ ...marks, [l.id]: s })}>{t(ATT_KEY[s])}</button>)}
                    </div>
                  </li>) })}
              </ul>
              {!closed && <button className="ad-btn primary" disabled={busy || Object.keys(marks).length === 0} onClick={save}>{t('attSave')}</button>}
            </>)}
          {!closed && (removing
            ? <div className="ad-card"><p className="ad-error">{t('attRemoveSure')}</p><button className="ad-btn" onClick={remove}>{t('attRemoveYes')}</button><button className="ad-link" onClick={() => setRemoving(false)}>{t('cancel')}</button></div>
            : <button className="ad-link" onClick={() => setRemoving(true)}>{t('attRemove')}</button>)}
        </div>)}
      <h3>{t('attHistory')}</h3>
      {data.sessions.length === 0 ? <p className="ad-note">{t('attNone')}</p> : (
        <ul className="ad-list">{data.sessions.map((s) => { const c = counts(s.d); return (
          <li key={s.id}><button onClick={() => setSel(s.id)}><strong>{fmtDate(s.d)}</strong><span>{c.marked ? t('attCount', { n: c.came, of: c.marked }) : t('attUnmarked')}</span>{s.note && <span className="ad-note">{s.note}</span>}</button></li>) })}</ul>)}
    </>
  )
}

// ===================================================================================== reports
export function ReportsTab({ role }) {
  const classes = useClassList()
  const [cls, setCls] = useState(null)
  const { t } = useAdult()
  if (!classes) return <p className="ad-note">{t('wait')}</p>
  if (cls) return <ClassReport key={cls} cls={cls} role={role} onBack={() => setCls(null)} />
  return <Overview classes={classes} onOpen={setCls} />
}

const reportCtx = (data) => ({ now: data.now, assignments: data.assignments })

// All the classes the person manages (the adult admin: every class), one card each, with totals on top.
function Overview({ classes, onOpen }) {
  const { t } = useAdult()
  const [items, setItems] = useState(null)
  useEffect(() => {
    let off = false
    ;(async () => {
      const list = [...classes].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? -1 : 1)).slice(0, 30)
      const res = await Promise.all(list.map((c) => staffApi.reportData(c.id)))
      if (!off) setItems(res.map((r, i) => ({ c: list[i], data: r.data, error: r.error })))
    })()
    return () => { off = true }
  }, [classes])
  if (!classes.length) return <p className="ad-note">{t('noClasses')}</p>
  if (!items) return <p className="ad-note">{t('wait')}</p>
  const sums = items.map((x) => ({ ...x, sum: x.data ? classSummary(x.data.learners, reportCtx(x.data)) : null }))
  const ok = sums.filter((x) => x.sum)
  const total = ok.reduce((a, x) => ({ learners: a.learners + x.sum.learners, support: a.support + x.sum.support, watch: a.watch + x.sum.watch, marked: a.marked + x.sum.attendanceMarks, att: a.att + (x.sum.attendanceRate == null ? 0 : x.sum.attendanceRate * x.sum.attendanceMarks) }), { learners: 0, support: 0, watch: 0, marked: 0, att: 0 })
  return (
    <section className="ad-stack">
      <div className="ad-card">
        <h2>{t('rpAllClasses')}</h2>
        <p>{t('rpLearnersN', { n: total.learners })} · {t('rpSupportN', { n: total.support })} · {t('rpWatchN', { n: total.watch })}</p>
        {total.marked > 0 && <p>{t('attRate', { pct: pct(total.att / total.marked), came: Math.round(total.att), of: total.marked })}</p>}
      </div>
      {sums.some((x) => x.error) && <p className="ad-banner">{t('rpLoadFail')}</p>}
      {sums.map(({ c, sum, data, error }) => (
        <div className="ad-card" key={c.id}>
          <h3>{c.name} {c.status === 'closed' ? t('admClosedClass') : ''}</h3>
          <p className="ad-note">{scheduleLine(t, c) || t('schNone')}</p>
          {error ? <p className="ad-error">{E(t, error)}</p> : (
            <>
              <p>{t('rpLearnersN', { n: sum.learners })}{sum.support ? ' · ' + t('rpSupportN', { n: sum.support }) : ''}{sum.watch ? ' · ' + t('rpWatchN', { n: sum.watch }) : ''}</p>
              {sum.attendanceRate != null && <p>{t('attRate', { pct: pct(sum.attendanceRate), came: Math.round(sum.attendanceRate * sum.attendanceMarks), of: sum.attendanceMarks })}</p>}
              {data.staff && data.staff.length === 0 && <p className="ad-note">{t('admNoTeacher')}</p>}
            </>)}
          <button className="ad-btn" onClick={() => onOpen(c.id)}>{t('rpOpen')}</button>
        </div>))}
    </section>
  )
}

function Rules() {
  const { t } = useAdult()
  const r = (x) => Math.round(x * 100)
  return (
    <details className="ad-card ad-noprint">
      <summary><strong>{t('rulesTitle')}</strong></summary>
      <p className="ad-note">{t('rulesIntro')}</p>
      <ul className="ad-rules">
        <li>{t('ruleAtt', { pct: r(T.ATT_LOW), n: T.ATT_MIN_SESSIONS, high: r(T.ATT_VERY_LOW) })}</li>
        <li>{t('ruleStreak', { n: T.ABSENT_STREAK })}</li>
        <li>{t('ruleInactive', { days: T.INACTIVE_DAYS, high: T.INACTIVE_HIGH })}</li>
        <li>{t('rulePractice', { n: T.PRACTICE_COUNT, pct: r(T.PRACTICE_SHARE), min: T.PRACTICE_MIN_DONE })}</li>
        <li>{t('ruleMaths', { pct: r(T.MATHS_LOW), n: T.MATHS_MIN_ITEMS, high: r(T.MATHS_VERY_LOW) })}</li>
        <li>{t('ruleChoice', { pct: r(T.MATHS_LOW), n: T.MC_MIN_ITEMS })}</li>
        <li>{t('ruleWork', { pct: r(T.WORK_LOW), n: T.WORK_MIN_MARKED })}</li>
        <li>{t('ruleOverdue', { n: T.WORK_OVERDUE })}</li>
      </ul>
      <p className="ad-note">{t('ruleLevel')}</p>
    </details>
  )
}

function ClassReport({ cls, role, onBack }) {
  const { t } = useAdult()
  const { loading, data, err, reload } = useReport(cls)
  const [open, setOpen] = useState(null); const [editing, setEditing] = useState(false); const [e2, setE2] = useState('')
  const sum = useMemo(() => (data ? classSummary(data.learners, reportCtx(data)) : null), [data])
  if (loading) return <p className="ad-note">{t('wait')}</p>
  if (err) return <><p className="ad-error" role="alert">{err}</p><button className="ad-link" onClick={onBack}>{t('rpBack')}</button></>
  if (open) {
    const item = sum.reports.find((x) => x.l.id === open)
    if (item) return <LearnerReport item={item} cls={data.class} now={data.now} onBack={() => setOpen(null)} />
  }
  const c = data.class
  const sorted = [...sum.reports].sort(bySupport)
  const unassign = async (email) => { setE2(''); const { error } = await staffApi.unassignFacilitator(cls, email); if (error) setE2(E(t, error)); else reload() }
  return (
    <section className="ad-stack ad-print-area">
      <button className="ad-link ad-noprint" onClick={onBack}>{t('rpBack')}</button>
      <PrintHead now={data.now} />
      <h2>{c.name}</h2>
      <p className="ad-note">{scheduleLine(t, c) || t('schNone')}</p>
      {c.status === 'active' && (editing ? <ScheduleEditor cls={c} onDone={(saved) => { setEditing(false); if (saved) reload() }} /> : <button className="ad-link ad-noprint" onClick={() => setEditing(true)}>{t('schEdit')}</button>)}
      {role === 'adult_admin' && data.staff && (
        <div className="ad-card ad-noprint">
          {data.staff.length === 0 ? <p className="ad-note">{t('admNoTeacher')}</p> : data.staff.map((em) => <div className="ad-row" key={em}><span>{em}</span><button className="ad-link" onClick={() => unassign(em)}>{t('admRemove')}</button></div>)}
          {e2 && <p className="ad-error" role="alert">{e2}</p>}
        </div>)}
      <div className="ad-card">
        <h3>{t('rpClassTitle')}</h3>
        <p>{t('rpLearnersN', { n: sum.learners })}</p>
        <p>{t('rpSupportN', { n: sum.support })} · {t('rpWatchN', { n: sum.watch })} · {t('rpOkN', { n: sum.ok })} · {t('rpNodataN', { n: sum.nodata })}</p>
        {sum.attendanceRate != null && <p>{t('attRate', { pct: pct(sum.attendanceRate), came: Math.round(sum.attendanceRate * sum.attendanceMarks), of: sum.attendanceMarks })}</p>}
        {sum.avgWork != null && <p>{t('rpAvgMark', { pct: pct(sum.avgWork) })}</p>}
        <h3>{t('rpAreasHeading')}</h3>
        <ul className="ad-rules">{AREAS.map((a) => <li key={a}><strong>{t(AREA_KEY[a])}:</strong> {sum.areas[a].learners ? t('rpClassAreas', { secure: sum.areas[a].secure, n: sum.areas[a].learners }) : t('rpClassAreasNone')}</li>)}</ul>
        <p className="ad-note">{t('rpMeasureNote')}</p>
      </div>
      <ul className="ad-list">
        {sorted.map(({ l, r }) => (
          <li key={l.id}><button onClick={() => setOpen(l.id)}>
            <strong>{l.name}</strong><StatusTag status={r.support.status} />
            {r.support.flags[0] && <span className="ad-note">{t(FLAG_KEY[r.support.flags[0].code], r.support.flags[0].vars)}{r.support.flags.length > 1 ? ' +' + (r.support.flags.length - 1) : ''}</span>}
          </button></li>))}
      </ul>
      <Rules />
      <button className="ad-btn ad-noprint" onClick={() => window.print()}>{t('rpPrint')}</button>
      <p className="ad-note ad-noprint">{t('rpPrintHelp')}</p>
    </section>
  )
}

function PrintHead({ now }) {
  const { t } = useAdult()
  return <div className="ad-print-only"><p><strong>ASARTUN ADULT LEARNING</strong></p><p>{t('rpMade', { date: fmtDate(now) })}</p><p>{t('rpConfidential')}</p></div>
}

function Bar({ value }) {
  return <div className="ad-progress" aria-hidden="true"><i style={{ width: Math.max(0, Math.min(1, value || 0)) * 100 + '%' }} /></div>
}

function LearnerReport({ item, cls, now, onBack }) {
  const { t } = useAdult()
  const { l, r } = item
  const att = r.attendance
  const recent = [...l.att].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 10)
  return (
    <section className="ad-stack ad-print-area">
      <button className="ad-link ad-noprint" onClick={onBack}>{t('rpBack')}</button>
      <PrintHead now={now} />
      <h2>{t('rpLearnerReport')}: {l.name}</h2>
      <p>{t('rpPhone')}: {l.phone} · {t('rpClassLine', { name: cls.name })}</p>
      <p>{r.lessons.lastActivity ? t('rpLastSeen', { date: fmtDate(r.lessons.lastActivity) }) : t('rpNoActivity')}</p>
      <div className="ad-card">
        <StatusTag status={r.support.status} />
        <h3>{t('rpFlags')}</h3>
        {r.support.flags.length === 0 ? <p className="ad-note">{t('rpNoFlags')}</p> : <ul className="ad-rules">{r.support.flags.map((f) => <li key={f.code}>{t(FLAG_KEY[f.code], f.vars)}</li>)}</ul>}
      </div>
      <div className="ad-card">
        <h3>{t('rpAreasHeading')}</h3>
        {AREAS.map((a) => { const x = r.areas[a]; return (
          <div key={a}><div className="ad-row"><strong>{t(AREA_KEY[a])}</strong><span>{t(LEVEL_KEY[x.level])}{x.items ? ' (' + t('evidenceN', { n: x.items }) + (x.level !== 'early' ? ', ' + pct(x.pct) + '%' : '') + ')' : ''}</span></div>{x.items > 0 && <Bar value={x.pct} />}</div>) })}
        <p className="ad-note">{t('rpMeasureNote')}</p>
      </div>
      <div className="ad-card">
        <h3>{t('rpLessons')}</h3>
        <p>{t('rpStarted', { n: r.lessons.attempted })} · {t('rpFinished', { n: r.lessons.completed })}</p>
        {r.lessons.avgTrace != null && <p>{t('rpTrace', { pct: pct(r.lessons.avgTrace) })}</p>}
        {r.maths.writtenPct != null && <p>{t('rpCalc', { pct: pct(r.maths.writtenPct) })}</p>}
        {r.maths.pickPct != null && <p>{t('rpChoice', { pct: pct(r.maths.pickPct) })}</p>}
        <h3>{t('rpPractice')}</h3>
        {r.lessons.practice.length === 0 ? <p className="ad-note">{t('rpNoPractice')}</p> : <ul className="ad-rules">{r.lessons.practice.map((k) => { const ls = lessonByKey(k); return <li key={k}>{ls ? t(ls.title.key, ls.title.vars) : k}</li> })}</ul>}
      </div>
      <div className="ad-card">
        <h3>{t('tAttendance')}</h3>
        {att.marked === 0 ? <p className="ad-note">{t('attNoRecord')}</p> : <p>{t('attRate', { pct: pct(att.rate), came: att.attended, of: att.marked })}</p>}
        <ul className="ad-rules">{recent.map((a) => <li key={a.d}>{fmtDate(a.d)}: {t(ATT_KEY[a.s])}</li>)}</ul>
        <h3>{t('tWork')}</h3>
        <p>{t('rpWorkLine', { sent: r.work.sent, given: r.work.given, marked: r.work.marked })}</p>
        {r.work.avgShare != null && <p>{t('rpAvgMark', { pct: pct(r.work.avgShare) })}</p>}
      </div>
      <div className="ad-card">
        <h3>{t('rpOverTime')}</h3>
        <ul className="ad-rules">{r.weekly.map((w) => <li key={w.week}><strong>{t('rpWeekOf', { date: fmtDate(w.week) })}:</strong> {t('rpWeekLine', { done: w.completed, came: w.attended, of: w.marked, work: w.work })}</li>)}</ul>
      </div>
      <button className="ad-btn ad-noprint" onClick={() => window.print()}>{t('rpPrint')}</button>
      <p className="ad-note ad-noprint">{t('rpPrintHelp')}</p>
    </section>
  )
}

// ===================================================================================== class schedule
export function ScheduleEditor({ cls, onDone }) {
  const { t } = useAdult()
  const p = scheduleParts(cls.schedule)
  const [f, setF] = useState({ mode: cls.mode, days: p.days, start: p.start || '16:00', end: p.end || '17:30', location: cls.location || '', note: p.note })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const toggle = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => a - b) })
  const go = async (e) => {
    e.preventDefault(); setErr('')
    const problem = scheduleProblem(f)
    if (problem) return setErr(t(SCHED_ERR[problem] || 'schErr'))
    setBusy(true)
    const { error } = await staffApi.setSchedule(cls.id, f)
    setBusy(false); if (error) return setErr(E(t, error))
    onDone(true)
  }
  return (
    <form className="ad-form ad-card ad-noprint" onSubmit={go}>
      <h3>{t('schTitle')}</h3>
      <fieldset className="ad-days"><legend>{t('schDays')}</legend>
        {DAYS.map((d) => <label key={d} className="ad-check"><input type="checkbox" checked={f.days.includes(d)} onChange={() => toggle(d)} />{t(DAY_KEY[d])}</label>)}
      </fieldset>
      {f.days.length > 0 && <div className="ad-grid"><label>{t('schStart')}<input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label><label>{t('schEnd')}<input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label></div>}
      <label>{t('howMeet')}<select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{Object.keys(MODE_KEY).map((m) => <option key={m} value={m}>{t(MODE_KEY[m])}</option>)}</select></label>
      <label>{t('location')}<input maxLength={120} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
      <label>{t('schNote')}<input maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
      {err && <p className="ad-error" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy}>{t('schSave')}</button>
      <button type="button" className="ad-link" onClick={() => onDone(false)}>{t('cancel')}</button>
    </form>
  )
}
