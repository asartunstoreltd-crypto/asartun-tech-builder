// Phase 7 — learner reports, attendance statistics and "needs additional support" rules.
// Pure functions only (no network, no React) so every rule can be tested. The database sends RAW facts
// (adult_report_data / adult_my_report); every judgement is made HERE, in one place, and each one carries a reason.
//
// Honest limits, repeated in docs/ADULT_PHASE7.md:
//  * Handwriting is never recognised by the app. "Writing" evidence = the tracing check (did the ink follow the guide)
//    plus the learner's/facilitator's own rating of independent writing. Teacher-marked assignments are shown separately.
//  * adult_lesson_progress keeps the BEST and LAST result per lesson, not every attempt, so "over time" means
//    when lessons were finished, when classes were attended and when work was marked.
//  * Too little evidence is shown as "not enough yet" — never as weak and never as good.
import { needsPractice, TRACE_OK } from './progress.js'
import { LESSONS as LIT } from './curriculum.js'
import { LESSONS as NUM } from './numeracy.js'
import { LESSONS as DIG, SAFETY_UNIT } from './digital.js'
import { dynamicLessonInfo, dynamicLessons, dynamicUnitIds } from './content.js'

// ---------------------------------------------------------------------------------------------- thresholds
// One place to change a rule. Each support flag below quotes the numbers it used.
export const T = {
  MIN_EVIDENCE: 4,            // fewer checks than this in a skill area = "not enough yet"
  SECURE: 0.8, DEVELOPING: 0.6,   // share of checks that went well
  ATT_MIN_SESSIONS: 3, ATT_LOW: 0.6, ATT_VERY_LOW: 0.4,   // attendance rate rules (need this many marked sessions first)
  ABSENT_STREAK: 2,           // this many absences in a row (latest marked sessions)
  INACTIVE_DAYS: 14, INACTIVE_HIGH: 28,   // days without lesson activity (only after being in the class this long)
  PRACTICE_MIN_DONE: 3, PRACTICE_SHARE: 0.4, PRACTICE_COUNT: 3,   // finished lessons that need practising again
  MATHS_MIN_ITEMS: 6, MATHS_LOW: 0.6, MATHS_VERY_LOW: 0.4,       // written maths and multiple-choice accuracy
  MC_MIN_ITEMS: 4,
  WORK_MIN_MARKED: 2, WORK_LOW: 0.5,       // average mark of reviewed assignments, as a share of full marks
  WORK_OVERDUE: 2,            // assignments past their due date with nothing sent
  SAFETY_MIN_ITEMS: 4, SAFETY_LOW: 0.6, SAFETY_VERY_LOW: 0.4,   // online-safety / scam questions (multiple choice, marked automatically)
  WEEKS: 8,                   // length of the "over time" view
}

export const AREAS = ['read', 'write', 'count', 'apply', 'digital', 'safety', 'other']
const APPLIED_NUM_UNITS = ['money', 'measure', 'finance']
const lit = Object.fromEntries(LIT.map((l) => [l.key, l.unit]))
const num = Object.fromEntries(NUM.map((l) => [l.key, l.unit]))
const dig = Object.fromEntries(DIG.map((l) => [l.key, l.unit]))
// Which course and unit a lesson key belongs to; null for a key the app does not know (never counted).
export function lessonInfo(key) {
  if (key in lit) return { course: 'literacy', unit: lit[key], applied: lit[key] === 'messages' }
  if (key in num) return { course: 'numeracy', unit: num[key], applied: APPLIED_NUM_UNITS.includes(num[key]) }
  if (key in dig) return { course: 'digital', unit: dig[key], applied: false }
  const d = dynamicLessonInfo(key)           // a lesson written in the dashboard
  if (d) return { course: d.course, unit: d.unit, applied: false, area: d.area }
  return null
}
export const APPLIED_KEYS = [...NUM.filter((l) => APPLIED_NUM_UNITS.includes(l.unit)).map((l) => l.key), ...LIT.filter((l) => l.unit === 'messages').map((l) => l.key)]

// ---------------------------------------------------------------------------------------------- data from the database
// The database sends compact rows; turn them into the same field names progress.js already understands.
export const expandRow = (c) => ({ lesson_key: c.k, status: c.s, attempts: c.a, best_trace: c.bt, best_calc: c.bc, write_rating: c.wr, last_results: c.r || {}, completed_at: c.c, updated_at: c.u })
const RATE = { yes: 1, help: 0.5, no: 0 }

// ---------------------------------------------------------------------------------------------- skill areas
// Pools "checks that went well" over every lesson the learner has done. Returns {read:{items,good,pct,level}, ...}.
export function skillAreas(progress) {
  const acc = Object.fromEntries(AREAS.map((a) => [a, { items: 0, good: 0 }]))
  const add = (area, items, good) => { acc[area].items += items; acc[area].good += good }
  for (const raw of progress || []) {
    const row = raw.lesson_key ? raw : expandRow(raw)
    const info = lessonInfo(row.lesson_key); if (!info) continue
    if (row.status !== 'completed' && row.status !== 'started') continue
    const r = row.last_results || {}
    // writing: the tracing check (pass = followed the guide) and the independent-writing rating (letters, words and digits)
    if ((info.course === 'literacy' && !info.applied) || info.course === 'numeracy') {
      if (row.best_trace != null) add('write', 1, Number(row.best_trace) >= TRACE_OK ? 1 : 0)
      if (row.write_rating in RATE) add('write', 1, RATE[row.write_rating])
    }
    if (info.course === 'custom') {   // a course written in the dashboard: its multiple-choice / tap / scam answers count toward the skill area the admin chose for the course
      if ((r.pickTotal || 0) > 0) add(AREAS.includes(info.area) ? info.area : 'other', r.pickTotal, Math.min(r.pickRight || 0, r.pickTotal))
      continue
    }
    if (info.course === 'digital') {   // phone and internet skills; scam / safety questions are pooled separately. All multiple choice or tap-the-place, marked automatically.
      if ((r.pickTotal || 0) > 0) add(info.unit === SAFETY_UNIT ? 'safety' : 'digital', r.pickTotal, Math.min(r.pickRight || 0, r.pickTotal))
      continue
    }
    if (info.course === 'literacy') {   // reading: matching and finding the right letter/word (multiple choice, marked automatically)
      const area = info.applied ? 'apply' : 'read'
      for (const k of ['match', 'find']) if (r[k] === 'yes' || r[k] === 'no') add(area, 1, r[k] === 'yes' ? 1 : 0)
    } else {   // numeracy: written calculations (self/facilitator rated) and multiple choice (auto) — counting, or applying when it is money/measure/finance
      const area = info.applied ? 'apply' : 'count'
      const w = (r.calcYes || 0) + (r.calcHelp || 0) + (r.calcNo || 0)
      if (w > 0) add(area, w, (r.calcYes || 0) + 0.5 * (r.calcHelp || 0))
      if ((r.pickTotal || 0) > 0) add(area, r.pickTotal, Math.min(r.pickRight || 0, r.pickTotal))
    }
  }
  const out = {}
  for (const a of AREAS) {
    const { items, good } = acc[a]
    const pct = items ? good / items : null
    out[a] = { items, good, pct, level: items === 0 ? 'none' : items < T.MIN_EVIDENCE ? 'early' : pct >= T.SECURE ? 'secure' : pct >= T.DEVELOPING ? 'developing' : 'building' }
  }
  return out
}

// ---------------------------------------------------------------------------------------------- lessons
export function lessonStats(progress) {
  const rows = (progress || []).map((r) => (r.lesson_key ? r : expandRow(r))).filter((r) => lessonInfo(r.lesson_key))
  const completed = rows.filter((r) => r.status === 'completed')
  const practice = completed.filter((r) => needsPractice(r)).map((r) => r.lesson_key)
  const traces = rows.filter((r) => r.best_trace != null).map((r) => Number(r.best_trace))
  const calc = rows.filter((r) => r.best_calc != null).map((r) => Number(r.best_calc))
  let last = null
  for (const r of rows) if (r.updated_at && (!last || r.updated_at > last)) last = r.updated_at
  return {
    attempted: rows.length, completed: completed.length, practice,
    avgTrace: traces.length ? traces.reduce((a, b) => a + b, 0) / traces.length : null,
    avgCalc: calc.length ? calc.reduce((a, b) => a + b, 0) / calc.length : null,
    lastActivity: last,
  }
}
// Multiple-choice and written-maths accuracy, pooled over numeracy lessons only (items, not lessons).
export function mathsStats(progress) {
  let wItems = 0, wGood = 0, pItems = 0, pGood = 0
  for (const raw of progress || []) {
    const row = raw.lesson_key ? raw : expandRow(raw)
    const info = lessonInfo(row.lesson_key); if (!info || info.course !== 'numeracy') continue
    const r = row.last_results || {}
    wItems += (r.calcYes || 0) + (r.calcHelp || 0) + (r.calcNo || 0); wGood += (r.calcYes || 0) + 0.5 * (r.calcHelp || 0)
    pItems += r.pickTotal || 0; pGood += Math.min(r.pickRight || 0, r.pickTotal || 0)
  }
  return { writtenItems: wItems, writtenPct: wItems ? wGood / wItems : null, pickItems: pItems, pickPct: pItems ? pGood / pItems : null }
}

// ---------------------------------------------------------------------------------------------- attendance
// att: [{d:'2026-11-02', s:'present'|'absent'|'late'}].  Late counts as attending (the person came).
export function attendanceStats(att) {
  const rows = [...(att || [])].filter((a) => ['present', 'absent', 'late'].includes(a.s)).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  const present = rows.filter((a) => a.s === 'present').length, late = rows.filter((a) => a.s === 'late').length, absent = rows.filter((a) => a.s === 'absent').length
  const marked = rows.length
  let streak = 0
  for (let i = rows.length - 1; i >= 0 && rows[i].s === 'absent'; i--) streak++
  return { marked, present, late, absent, attended: present + late, rate: marked ? (present + late) / marked : null, absentStreak: streak }
}

// ---------------------------------------------------------------------------------------------- assignments
// subs: latest attempt per assignment {a, st, score, rv, at}; assignments: [{id, due, max, status}]
export function workStats(subs, assignments, now) {
  const byA = Object.fromEntries((subs || []).map((s) => [s.a, s]))
  const marked = (subs || []).filter((s) => s.st === 'reviewed' && s.score != null)
  const maxOf = Object.fromEntries((assignments || []).map((a) => [a.id, Number(a.max) || 0]))
  const shares = marked.map((s) => (maxOf[s.a] ? Math.min(1, Number(s.score) / maxOf[s.a]) : null)).filter((x) => x != null)
  const t = now instanceof Date ? now.getTime() : Date.parse(now)
  const overdueUnsent = (assignments || []).filter((a) => a.due && Date.parse(a.due) < t && !byA[a.id]).length
  return {
    given: (assignments || []).length, sent: (subs || []).length, marked: marked.length,
    avgShare: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null,
    overdueUnsent, waiting: (subs || []).filter((s) => s.st === 'submitted').length, redo: (subs || []).filter((s) => s.st === 'redo').length,
  }
}

// ---------------------------------------------------------------------------------------------- "needs additional support"
// Every flag: {code, level:'watch'|'high', vars} — the page turns code+vars into a plain sentence. No hidden scoring.
const daysBetween = (a, b) => Math.floor((b - a) / 86400000)
export function supportFlags(l, ctx) {
  const now = ctx.now instanceof Date ? ctx.now : new Date(ctx.now)
  const lessons = lessonStats(l.prog), maths = mathsStats(l.prog), att = attendanceStats(l.att), work = workStats(l.subs, ctx.assignments, now)
  const flags = []
  if (att.marked >= T.ATT_MIN_SESSIONS && att.rate < T.ATT_LOW) flags.push({ code: 'attLow', level: att.rate < T.ATT_VERY_LOW ? 'high' : 'watch', vars: { came: att.attended, of: att.marked } })
  if (att.absentStreak >= T.ABSENT_STREAK) flags.push({ code: 'absentStreak', level: 'watch', vars: { n: att.absentStreak } })
  // inactivity: only once the person has been in the class long enough to have had the chance
  const joined = l.joined ? Date.parse(l.joined) : null
  const since = lessons.lastActivity ? Date.parse(lessons.lastActivity) : joined
  if (since != null && joined != null && daysBetween(joined, now) >= T.INACTIVE_DAYS) {
    const idle = daysBetween(since, now)
    if (idle >= T.INACTIVE_DAYS) flags.push({ code: lessons.lastActivity ? 'inactive' : 'neverStarted', level: idle >= T.INACTIVE_HIGH ? 'high' : 'watch', vars: { days: idle } })
  }
  if (lessons.completed >= T.PRACTICE_MIN_DONE && (lessons.practice.length >= T.PRACTICE_COUNT || lessons.practice.length / lessons.completed >= T.PRACTICE_SHARE) && lessons.practice.length > 0)
    flags.push({ code: 'practice', level: 'watch', vars: { n: lessons.practice.length, of: lessons.completed } })
  if (maths.writtenItems >= T.MATHS_MIN_ITEMS && maths.writtenPct < T.MATHS_LOW) flags.push({ code: 'mathsLow', level: maths.writtenPct < T.MATHS_VERY_LOW ? 'high' : 'watch', vars: { pct: Math.round(maths.writtenPct * 100), n: maths.writtenItems } })
  if (maths.pickItems >= T.MC_MIN_ITEMS && maths.pickPct < T.MATHS_LOW) flags.push({ code: 'choiceLow', level: maths.pickPct < T.MATHS_VERY_LOW ? 'high' : 'watch', vars: { pct: Math.round(maths.pickPct * 100), n: maths.pickItems } })
  if (work.marked >= T.WORK_MIN_MARKED && work.avgShare < T.WORK_LOW) flags.push({ code: 'workLow', level: 'watch', vars: { pct: Math.round(work.avgShare * 100), n: work.marked } })
  if (work.overdueUnsent >= T.WORK_OVERDUE) flags.push({ code: 'workOverdue', level: 'watch', vars: { n: work.overdueUnsent } })
  const safety = skillAreas(l.prog).safety
  if (safety.items >= T.SAFETY_MIN_ITEMS && safety.pct < T.SAFETY_LOW) flags.push({ code: 'safetyLow', level: safety.pct < T.SAFETY_VERY_LOW ? 'high' : 'watch', vars: { pct: Math.round(safety.pct * 100), n: safety.items } })
  const evidence = lessons.attempted + att.marked + work.marked
  const status = evidence === 0 && flags.length === 0 ? 'nodata' : flags.some((f) => f.level === 'high') || flags.length >= 2 ? 'support' : flags.length === 1 ? 'watch' : 'ok'
  return { status, flags }
}

// ---------------------------------------------------------------------------------------------- one learner, everything
export function learnerReport(l, ctx) {
  return {
    lessons: lessonStats(l.prog), maths: mathsStats(l.prog), areas: skillAreas(l.prog), attendance: attendanceStats(l.att),
    work: workStats(l.subs, ctx.assignments, ctx.now), support: supportFlags(l, ctx), weekly: weeklySeries(l, ctx.now),
  }
}

// ---------------------------------------------------------------------------------------------- over time
export function weekStart(d) {
  const x = new Date(typeof d === 'string' ? d : d.getTime()); const day = (x.getUTCDay() + 6) % 7   // Monday = 0
  const m = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate() - day))
  return m.toISOString().slice(0, 10)
}
// Last `weeks` weeks (oldest first): lessons finished, sessions attended / marked, work marked with its average share.
export function weeklySeries(l, now, weeks = T.WEEKS) {
  const n = now instanceof Date ? now : new Date(now)
  const start = weekStart(n); const keys = []
  for (let i = weeks - 1; i >= 0; i--) { const d = new Date(start + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7 * i); keys.push(d.toISOString().slice(0, 10)) }
  const out = Object.fromEntries(keys.map((k) => [k, { week: k, completed: 0, attended: 0, marked: 0, work: 0 }]))
  for (const raw of l.prog || []) { const r = raw.lesson_key ? raw : expandRow(raw); if (r.status === 'completed' && r.completed_at) { const k = weekStart(r.completed_at); if (out[k]) out[k].completed++ } }
  for (const a of l.att || []) { if (!a.d) continue; const k = weekStart(a.d + 'T00:00:00Z'); if (out[k] && ['present', 'absent', 'late'].includes(a.s)) { out[k].marked++; if (a.s !== 'absent') out[k].attended++ } }
  for (const s of l.subs || []) { if (s.st === 'reviewed' && s.rv) { const k = weekStart(s.rv); if (out[k]) out[k].work++ } }
  return keys.map((k) => out[k])
}

// ---------------------------------------------------------------------------------------------- a whole class
export function classSummary(learners, ctx) {
  const reports = learners.map((l) => ({ l, r: learnerReport(l, ctx) }))
  const count = (s) => reports.filter((x) => x.r.support.status === s).length
  let marked = 0, attended = 0
  for (const { r } of reports) { marked += r.attendance.marked; attended += r.attendance.attended }
  const areas = {}
  for (const a of AREAS) {
    const have = reports.filter((x) => x.r.areas[a].items >= T.MIN_EVIDENCE)
    areas[a] = { learners: have.length, secure: have.filter((x) => x.r.areas[a].level === 'secure').length, building: have.filter((x) => x.r.areas[a].level === 'building').length }
  }
  const shares = reports.map((x) => x.r.work.avgShare).filter((x) => x != null)
  return {
    learners: learners.length, support: count('support'), watch: count('watch'), ok: count('ok'), nodata: count('nodata'),
    attendanceRate: marked ? attended / marked : null, attendanceMarks: marked,
    lessonsCompleted: reports.reduce((s, x) => s + x.r.lessons.completed, 0),
    avgWork: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null,
    areas, reports,
  }
}
// Order learners so those who need most help come first (high flags, then more flags, then name).
export const bySupport = (a, b) => {
  const rank = { support: 0, watch: 1, nodata: 2, ok: 3 }
  return rank[a.r.support.status] - rank[b.r.support.status] || b.r.support.flags.length - a.r.support.flags.length || a.l.name.localeCompare(b.l.name)
}

// ---------------------------------------------------------------------------------------------- learner's own view
// What the learner can do, said as facts about their own work — no ranking, no points, no comparison with others.
export function learnerView(prog, att, subs, now = new Date()) {
  const rows = (prog || []).map((r) => (r.lesson_key ? r : expandRow(r))).filter((r) => lessonInfo(r.lesson_key))
  const byKey = Object.fromEntries(rows.map((r) => [r.lesson_key, r]))
  const unit = (list, courseUnits) => { const l = list.filter((x) => courseUnits.includes(x.unit)); const done = l.filter((x) => byKey[x.key]?.status === 'completed'); return { total: l.length, done: done.length, solid: done.filter((x) => !needsPractice(byKey[x.key])).length } }
  const areas = skillAreas(prog)
  const maths = mathsStats(prog)
  const practise = rows.filter((r) => r.status === 'completed' && needsPractice(r)).map((r) => r.lesson_key).slice(0, 5)
  const a = attendanceStats(att)
  const marked = (subs || []).filter((s) => s.st === 'reviewed')
  return {
    letters: unit(LIT, ['letters']), words: unit(LIT, ['words', 'name']), sentences: unit(LIT, ['sentences', 'messages']),
    digits: unit(NUM, ['numbers', 'compare']),
    calc: unit(NUM, ['add_sub', 'mult_div']), applied: unit(NUM, ['money', 'measure', 'finance']),
    digital: unit(DIG, ['phone', 'calls', 'texts', 'chat', 'web', 'search']), safety: unit(DIG, [SAFETY_UNIT]), other: unit(dynamicLessons(), dynamicUnitIds()),
    writtenRight: maths.writtenItems ? Math.round(maths.writtenPct * maths.writtenItems) : 0, writtenTotal: maths.writtenItems,
    areas, practise, attendance: a, markedWork: marked.length, anyProgress: rows.length > 0,
    next: nextLessonKey(byKey),
  }
}
function nextLessonKey(byKey) {
  const all = [...LIT, ...NUM, ...DIG, ...dynamicLessons()]
  const started = all.filter((l) => byKey[l.key] && byKey[l.key].status !== 'completed')[0]
  return started ? started.key : null
}

// ---------------------------------------------------------------------------------------------- class schedule
export const DAYS = [1, 2, 3, 4, 5, 6, 7]   // 1 = Monday … 7 = Sunday
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/
// Same rules as the database function adult_set_class_schedule. Returns null when fine, else a problem code.
export function scheduleProblem(s) {
  if (!s || typeof s !== 'object') return 'sched'
  if (!Array.isArray(s.days) || s.days.length > 7 || s.days.some((d) => !DAYS.includes(d)) || new Set(s.days).size !== s.days.length) return 'schedDays'
  if (s.days.length > 0) {
    if (!TIME.test(s.start || '') || !TIME.test(s.end || '')) return 'schedTime'
    if (s.end <= s.start) return 'schedOrder'
  }
  if (!['physical', 'online', 'both'].includes(s.mode)) return 'sched'
  if (s.location != null && String(s.location).length > 120) return 'sched'
  if (s.note != null && String(s.note).length > 200) return 'sched'
  return null
}
// Turn the stored schedule into a short line: days (sorted), times. Day NAMES come from the page (translated).
export function scheduleParts(sch) {
  const days = Array.isArray(sch?.days) ? [...sch.days].filter((d) => DAYS.includes(d)).sort((a, b) => a - b) : []
  return { days, start: sch?.start || '', end: sch?.end || '', note: sch?.note || '' }
}
// Sessions whose date is within the last `n` days — for "recent attendance".
export const recentSessions = (sessions, now, n = 30) => (sessions || []).filter((s) => daysBetween(Date.parse(s.d + 'T00:00:00Z'), now instanceof Date ? now : new Date(now)) <= n)
