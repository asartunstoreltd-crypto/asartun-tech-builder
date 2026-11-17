// Reading the progress rows: what counts as "needs more practice". Pure functions, tested.
// Completed is NOT the same as learned: a lesson can be finished while the tracing never followed the guide.
import { TRACE_OK } from './guide.js'            // a passing trace scores at least this; a failed one never does
export { TRACE_OK }

export function needsPractice(row) {
  if (!row) return false
  const ev = calcEvidence(row).status
  if (ev === 'practise' || ev === 'mismatch') return true
  const r = row.last_results || {}
  if (row.best_trace != null && Number(row.best_trace) < TRACE_OK) return true
  if (row.write_rating === 'no') return true
  if (r.match === 'no' || r.find === 'no') return true
  return false
}

// rows: adult_lesson_progress rows; allKeys: every lesson key in order
export function summarize(rows, allKeys) {
  const byKey = Object.fromEntries((rows || []).map((r) => [r.lesson_key, r]))
  const completed = allKeys.filter((k) => byKey[k]?.status === 'completed')
  const practice = completed.filter((k) => needsPractice(byKey[k]))
  const next = allKeys.find((k) => byKey[k]?.status !== 'completed') || null
  return { total: allKeys.length, completed: completed.length, practice, next, byKey }
}

// ---- Numeracy (Phase 5): can the learner REALLY calculate, or only finish lessons? ----
// Two independent signals from the last run of a lesson:
//   self = written answers, marked by the learner ("same" = 1, "nearly / needed help" = 0.5, "different" = 0)  -> an opinion
//   quiz = multiple-choice questions marked by the app                                                          -> objective
// 'shown'     the app-marked questions were mostly right (and the learner's own view agrees, if they wrote answers)
// 'mismatch'  the learner says the written answers were right but the app-marked ones were not: a facilitator should look
// 'practise'  either signal is weak        'building' some evidence, not yet convincing (e.g. only written answers)
// 'none'      no calculation questions in the last run.   Never 'verified': only a facilitator's own check does that (adult_skill_checks).
export const SELF_OK = 0.7, QUIZ_OK = 0.8, QUIZ_LOW = 0.5, MISMATCH_SELF = 0.8, MISMATCH_QUIZ = 0.6
export function calcEvidence(row) {
  const r = (row && row.last_results) || {}
  const cN = Number(r.calcN) || 0, qN = Number(r.quizN) || 0
  if (!cN && !qN) return { status: 'none', self: null, quiz: null }
  const self = cN ? (Number(r.calcYes || 0) + 0.5 * Number(r.calcHelp || 0)) / cN : null
  const quiz = qN ? Number(r.quizRight || 0) / qN : null
  let status
  if (self !== null && quiz !== null && self >= MISMATCH_SELF && quiz < MISMATCH_QUIZ) status = 'mismatch'
  else if ((quiz !== null && quiz <= QUIZ_LOW) || (self !== null && self <= QUIZ_LOW)) status = 'practise'      // half right is not yet convincing
  else if (quiz !== null && quiz >= QUIZ_OK && (self === null || self >= SELF_OK)) status = 'shown'
  else status = 'building'
  return { status, self, quiz }
}

// Per unit (skill area): how many lessons are done, how many show real calculation, and how the unit's check lesson went.
export function unitEvidence(unit, byKey) {
  const rows = unit.lessons.map((l) => byKey[l.key]).filter(Boolean)
  const done = rows.filter((r) => r.status === 'completed').length
  const ev = unit.lessons.map((l) => (byKey[l.key] ? calcEvidence(byKey[l.key]).status : 'none'))
  const check = unit.lessons.find((l) => l.id.startsWith('check_'))
  return { total: unit.lessons.length, done, shown: ev.filter((e) => e === 'shown').length, mismatch: ev.filter((e) => e === 'mismatch').length,
           check: check && byKey[check.key] ? calcEvidence(byKey[check.key]).status : 'none' }
}
