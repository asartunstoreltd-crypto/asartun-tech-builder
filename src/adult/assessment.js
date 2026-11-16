// Initial assessment: the 12 items, how they are scored and how a starting point is recommended.
// Pure functions (no React, no network) so they can be tested: scripts/test-adult.mjs.
//
// Honesty rules built into the design:
//  * Items the app cannot check by itself are rated by the learner (self mode) or the facilitator (assisted mode).
//    Handwriting is NEVER auto-recognised: the learner writes, the app shows the correct answer, and a person says
//    whether it matched.
//  * 'skipped' items are NOT counted as failures. A domain with nothing assessed has no level, and the result says so.
//  * The recommendation is advisory. A facilitator can repeat the assessment with the learner at any time.

// kind: 'choice' (auto-scored), 'write_check' (write, see answer, rate), 'rated' (rate only)
// needsAudio: the instruction cannot be understood by someone who cannot read yet, so a recording is expected.
// staffOnly: only makes sense when a facilitator is present.
export const ITEMS = [
  { id: 'l1_recognize', domain: 'letters', kind: 'choice', needsAudio: true, target: 'K', options: ['M', 'K', 'R', 'S'] },
  { id: 'l2_sound', domain: 'letters', kind: 'rated', staffOnly: true, display: 'B' },
  { id: 'w1_letter', domain: 'writing', kind: 'write_check', needsAudio: true, answer: 'A' },
  { id: 'w2_name', domain: 'writing', kind: 'write_check', answer: null /* the learner's own name, filled in by the page */ },
  { id: 'w3_word', domain: 'writing', kind: 'write_check', needsAudio: true, answer: 'BA' },
  { id: 'r1_word', domain: 'reading', kind: 'choice', needsAudio: true, target: 'gida', options: ['rana', 'gida', 'kaza'] },
  { id: 'r2_sentence', domain: 'reading', kind: 'rated', display: 'Ina gida.' },
  { id: 'n1_recognize', domain: 'numbers', kind: 'choice', needsAudio: true, target: '7', options: ['3', '7', '5', '9'] },
  { id: 'n2_count', domain: 'numbers', kind: 'choice', dots: 6, target: '6', options: ['4', '5', '6', '8'] },
  { id: 'c1_add', domain: 'calc', kind: 'write_check', question: '7 + 5 = ?', answer: '12' },
  { id: 'c2_sub', domain: 'calc', kind: 'write_check', question: '9 − 4 = ?', answer: '5' },
  { id: 'p1_phone', domain: 'phone', kind: 'rated' },
]
export const DOMAINS = ['letters', 'writing', 'reading', 'numbers', 'calc', 'phone']
const POINTS = { yes: 1, help: 0.5, no: 0 }

// answers: [{id, result:'yes'|'help'|'no'|'skipped', source}]  ->  { domain: level 0..3 | null }
export function scoreAnswers(answers) {
  const out = {}
  for (const d of DOMAINS) {
    const rows = answers.filter((a) => (ITEMS.find((i) => i.id === a.id) || {}).domain === d && a.result !== 'skipped')
    if (!rows.length) { out[d] = null; continue }
    const ratio = rows.reduce((s, a) => s + POINTS[a.result], 0) / rows.length
    out[d] = ratio < 0.25 ? 0 : ratio < 0.6 ? 1 : ratio < 0.9 ? 2 : 3
  }
  return out
}

const minKnown = (vals) => { const k = vals.filter((v) => v !== null && v !== undefined); return k.length ? Math.min(...k) : null }
export const LITERACY_START = ['letters', 'words', 'sentences', 'practical']      // matches the Phase 4 lesson order
export const NUMERACY_START = ['numbers', 'add_sub', 'mult_div', 'money']          // matches the Phase 5 lesson order

export function recommend(scores) {
  const lit = minKnown([scores.letters, scores.writing, scores.reading])
  const num = minKnown([scores.numbers, scores.calc])
  const notAssessed = DOMAINS.filter((d) => scores[d] === null || scores[d] === undefined)
  return {
    literacy: { level: lit, start: lit === null ? null : LITERACY_START[lit] },
    numeracy: { level: num, start: num === null ? null : NUMERACY_START[num] },
    // Digital skills follow reading ability. When we cannot tell, say so instead of guessing.
    digital: { ready: lit === null || scores.phone == null ? null : (lit >= 2 && scores.phone >= 1) },
    complete: notAssessed.length === 0,
    notAssessed,
  }
}
