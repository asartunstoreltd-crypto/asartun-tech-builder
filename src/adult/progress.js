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
  const written = (r.calcYes || 0) + (r.calcHelp || 0) + (r.calcNo || 0)
  if (written > 0 && ((r.calcYes || 0) + 0.5 * (r.calcHelp || 0)) / written < 0.67) return true       // handwritten answers often different from the correct one
  if ((r.pickTotal || 0) > 0 && (r.pickRight || 0) / r.pickTotal < 0.67) return true               // multiple-choice marked automatically
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

// Combine the answers given in one run of a lesson into the result fields stored in the database.
// answers[i] belongs to step i, so going Back and answering again REPLACES the earlier answer instead of counting twice.
//   {type:'trace', score, tries} {type:'write', rating} {type:'match'|'find'|'pick', ok} {type:'calc', rating}
export const RESULT_KEYS = ['trace', 'write', 'match', 'find', 'steps', 'traceTries', 'calcYes', 'calcHelp', 'calcNo', 'pickRight', 'pickTotal']
export function aggregateResults(steps, answers) {
  const out = { trace: null, write: null, match: null, find: null, steps: Math.max(0, steps.length - 1), traceTries: 0, calcYes: 0, calcHelp: 0, calcNo: 0, pickRight: 0, pickTotal: 0 }
  const rank = { yes: 0, help: 1, no: 2 }
  steps.forEach((_, i) => {
    const a = answers[i]; if (!a) return
    if (a.type === 'trace') { out.trace = Math.max(out.trace ?? 0, a.score); out.traceTries += a.tries || 0 }
    else if (a.type === 'write') out.write = out.write === null || rank[a.rating] > rank[out.write] ? a.rating : out.write       // the weakest rating counts
    else if (a.type === 'match' || a.type === 'find') out[a.type] = out[a.type] === 'no' ? 'no' : a.ok ? 'yes' : 'no'
    else if (a.type === 'pick') { out.pickTotal++; if (a.ok) out.pickRight++ }
    else if (a.type === 'calc') { if (a.rating === 'yes') out.calcYes++; else if (a.rating === 'help') out.calcHelp++; else out.calcNo++ }
  })
  return out
}
