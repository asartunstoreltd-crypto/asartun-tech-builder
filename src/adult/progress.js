// Reading the progress rows: what counts as "needs more practice". Pure functions, tested.
// Completed is NOT the same as learned: a lesson can be finished while the tracing never followed the guide.
import { TRACE_OK } from './guide.js'            // a passing trace scores at least this; a failed one never does
export { TRACE_OK }

export function needsPractice(row) {
  if (!row) return false
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
