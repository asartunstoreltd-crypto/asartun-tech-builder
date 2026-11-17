// What one finished lesson run sends to the database (adult_record_lesson). Pure functions, tested against the SQL.
// Marking rules, stated once:
//   calc*  = written answers. The app NEVER reads handwriting: the learner (or a facilitator) says "same / nearly / different".
//   quiz*  = multiple-choice questions marked by the app. This is the objective cross-check on the written answers.
const MAX = 50
const clamp = (n) => Math.max(0, Math.min(MAX, Math.round(Number(n) || 0)))

export const emptyResults = () => ({ trace: null, write: null, match: null, find: null, traceTries: 0, calcN: 0, calcYes: 0, calcHelp: 0, quizN: 0, quizRight: 0 })
export const addQuiz = (r, correct) => ({ ...r, quizN: r.quizN + 1, quizRight: r.quizRight + (correct ? 1 : 0) })
export const addCalc = (r, rating) => ({ ...r, calcN: r.calcN + 1, calcYes: r.calcYes + (rating === 'yes' ? 1 : 0), calcHelp: r.calcHelp + (rating === 'help' ? 1 : 0) })

// numeracy lessons also send the written/choice counts; literacy lessons send exactly what they sent in Phase 4.
export function buildResults(r, stepCount, numeracy) {
  const base = { trace: r.trace, write: r.write, match: r.match, find: r.find, steps: stepCount, traceTries: r.traceTries || 0 }
  if (!numeracy) return base
  return { trace: r.trace, write: r.write, steps: stepCount, traceTries: r.traceTries || 0, calcN: clamp(r.calcN), calcYes: clamp(r.calcYes), calcHelp: clamp(r.calcHelp), quizN: clamp(r.quizN), quizRight: clamp(r.quizRight) }
}

// "Done" is only offered once something was really written: a single touch or only eraser lines is not an answer.
export const hasInk = (strokes) => (strokes || []).some((s) => s.tool === 'pen' && s.pts && s.pts.length >= 2)
