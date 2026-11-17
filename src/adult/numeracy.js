// Course B — Basic Numeracy. Like the literacy course, the curriculum is DATA in this file (reviewable in one place, checked by tests);
// progress is stored in the database by lesson key.   STATUS: Hausa number words and all Hausa text are a DRAFT for review.
//
// Step types (new ones marked *):
//   teach    explain: digit / explain / tens / check            show   animated stroke demonstration of a digit
//   trace    write over a faint guide (digits 0-9 have guides)  write  write alone, compare with the model, say how it went
//   pickNumber*  hear/see a number WORD, choose the digit(s)    count* count the objects, choose how many   compare* choose the bigger / smaller number
//   calc*    WRITE the answer with a finger, then see the correct answer and say how it went (self-marked: the app never reads handwriting)
//   quiz*    the same kind of sum as multiple choice, marked by the app (the objective cross-check)
//   review   summary, then the progress is saved
// Every calc / quiz item is [question, answer]. Questions use + − × ÷ and may carry a unit (₦, kg, L); the answer is a whole number.
// Tests evaluate every question and compare it with its stored answer, so a wrong answer key cannot be shipped.
import { DIGITS } from './guide.js'

export const COURSE_SLUG = 'basic-numeracy'
export const SKILLS = ['numbers', 'add_sub', 'mult_div', 'money']

// digit, Hausa word (DRAFT), English
export const DIGIT_WORDS = [
  ['0', 'sifili', 'zero'], ['1', 'ɗaya', 'one'], ['2', 'biyu', 'two'], ['3', 'uku', 'three'], ['4', 'huɗu', 'four'],
  ['5', 'biyar', 'five'], ['6', 'shida', 'six'], ['7', 'bakwai', 'seven'], ['8', 'takwas', 'eight'], ['9', 'tara', 'nine'],
]
export const TENS = [
  ['10', 'goma', 'ten'], ['20', 'ashirin', 'twenty'], ['30', 'talatin', 'thirty'], ['40', "arba'in", 'forty'], ['50', 'hamsin', 'fifty'],
  ['60', 'sittin', 'sixty'], ['70', "saba'in", 'seventy'], ['80', 'tamanin', 'eighty'], ['90', "casa'in", 'ninety'], ['100', 'ɗari', 'one hundred'],
]

// ---------- small pure helpers (used by the player and by the tests) ----------
export const unitOf = (q) => (String(q).includes('₦') ? '₦' : /\bkg\b/.test(q) ? 'kg' : /\bL\b/.test(q) ? 'L' : '')
export const fmt = (a, u) => (u === '₦' ? '₦' + a : u ? a + ' ' + u : String(a))

// Evaluate "12 + 5 = ?" style questions (no eval). Units are ignored. Returns null for anything that is not plain arithmetic.
export function evalQuestion(q) {
  const s = String(q).replace(/=\s*\?\s*$/, '').replace(/₦|\bkg\b|\bL\b/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '')
  if (!/^[0-9+\-*/()]+$/.test(s)) return null
  const tok = s.match(/\d+|[+\-*/()]/g); let i = 0
  const expr = () => { let v = term(); while (tok[i] === '+' || tok[i] === '-') { const o = tok[i++]; const r = term(); v = o === '+' ? v + r : v - r } return v }
  const term = () => { let v = atom(); while (tok[i] === '*' || tok[i] === '/') { const o = tok[i++]; const r = atom(); v = o === '*' ? v * r : v / r } return v }
  const atom = () => { if (tok[i] === '(') { i++; const v = expr(); i++; return v } return Number(tok[i++]) }
  try { const v = expr(); return i === tok.length && Number.isFinite(v) ? v : null } catch { return null }
}
// "5, 10, 15, ?" -> 20 (a constant step), else null
export function nextInSequence(q) {
  const n = String(q).replace(/\?\s*$/, '').split(',').map((x) => x.trim()).filter(Boolean).map(Number)
  if (n.length < 3 || n.some((x) => !Number.isInteger(x))) return null
  const d = n[1] - n[0]
  return n.every((x, i) => i === 0 || x - n[i - 1] === d) ? n[n.length - 1] + d : null
}

const rot = (arr, n) => arr.map((_, i) => arr[(i + n) % arr.length])
// Three wrong answers near the right one (the near ones are the interesting ones: they catch guessing). Deterministic.
export function choicesFor(a, seed = 0) {
  const steps = a >= 1000 ? [500, -500, 1000, -1000, 100] : a >= 100 ? [50, -50, 100, -100, 10] : a >= 20 ? [10, -10, 1, -1, 5] : [1, -1, 2, -2, 3]
  const wrong = []
  for (const d of steps) { const v = a + d; if (v >= 0 && v !== a && !wrong.includes(v)) wrong.push(v); if (wrong.length === 3) break }
  return rot([a, ...wrong], seed % 4)
}

// ---------- step builders ----------
const calc = (ctx) => ([q, a]) => ({ type: 'calc', q, a, u: unitOf(q), ...(ctx ? { ctx } : {}) })
const quiz = (ctx) => ([q, a], i) => ({ type: 'quiz', q, a, u: unitOf(q), options: choicesFor(a, i + 1), ...(ctx ? { ctx } : {}) })
const dotsCalc = (n) => ({ type: 'calc', dots: n, a: n, u: '' })
const countStep = (n, i) => ({ type: 'count', n, options: choicesFor(n, i), target: n })
const compareStep = ([a, b, ask], i) => ({ type: 'compare', a, b, ask, target: ask === 'bigger' ? Math.max(a, b) : Math.min(a, b), options: i % 2 ? [b, a] : [a, b] })
const R = { type: 'review' }
const keyOf = (id) => 'n-' + id.replace(/_/g, '-')

function lesson(unit, id, steps, title) {
  return { key: keyOf(id), id, unit, title: title || { key: 'nl_' + id, vars: {} }, steps: [...steps, R] }
}

// A lesson that teaches one kind of sum: explain with a worked example, 4 written answers, 2 auto-marked choices.
function sumLesson(unit, id, example, written, choices, ctx) {
  return lesson(unit, id, [{ type: 'teach', kind: 'explain', id, example, u: unitOf(example[0]), ...(ctx ? { ctx } : {}) }, ...written.map(calc(ctx)), ...choices.map(quiz(ctx))])
}
// A unit check: no teaching, 4 written answers + 4 auto-marked choices of the unit's skill. Gives the clearest evidence of real ability.
function checkLesson(unit, id, written, choices) {
  return lesson(unit, id, [{ type: 'teach', kind: 'check', id }, ...written.map(calc()), ...choices.map(quiz())])
}

// ---------- unit 1: numbers ----------
function digitLesson([d, word, gloss], i) {
  const others = DIGITS.filter((x) => x !== d)
  const options = rot([d, ...rot(others, i * 3 + 1).slice(0, 3)], i % 4)
  return lesson('numbers', 'digit_' + d, [
    { type: 'teach', kind: 'digit', digit: d, word, gloss },
    { type: 'show', text: d },
    { type: 'trace', text: d },
    { type: 'write', text: d },
    { type: 'pickNumber', word, target: d, options },
    ...(d === '0' ? [] : [countStep(Number(d), i)]),
  ], { key: 'lessonDigitTitle', vars: { d } })
}
const COUNT10 = [3, 5, 7, 9]
const COUNT20 = [12, 15, 17, 20]
const COMPARE = [[7, 3, 'bigger'], [12, 9, 'bigger'], [5, 8, 'smaller'], [20, 15, 'smaller']]
const numbersUnit = [
  ...DIGIT_WORDS.map(digitLesson),
  lesson('numbers', 'count10', [{ type: 'teach', kind: 'explain', id: 'count10' }, ...COUNT10.map(countStep)]),
  lesson('numbers', 'count20', [{ type: 'teach', kind: 'explain', id: 'count20' }, ...COUNT20.map(countStep)]),
  lesson('numbers', 'compare', [{ type: 'teach', kind: 'explain', id: 'compare' }, ...COMPARE.map(compareStep)]),
  lesson('numbers', 'tens', [
    { type: 'teach', kind: 'tens' }, { type: 'show', text: '30' }, { type: 'trace', text: '30' }, { type: 'write', text: '50' },
    { type: 'pickNumber', word: 'ashirin', target: '20', options: ['20', '50', '30', '10'] },
    { type: 'pickNumber', word: 'sittin', target: '60', options: ['16', '60', '50', '66'] },
  ]),
  lesson('numbers', 'writenum', [{ type: 'teach', kind: 'explain', id: 'writenum' }, ...[11, 13, 16, 18].map(dotsCalc), countStep(14, 1), countStep(19, 2)]),
  lesson('numbers', 'check_numbers', [
    { type: 'teach', kind: 'check', id: 'check_numbers' }, dotsCalc(12), dotsCalc(17),
    { type: 'calc', q: '5, 6, 7, ?', a: 8, u: '' }, { type: 'calc', q: '10, 12, 14, ?', a: 16, u: '' },
    countStep(13, 1), countStep(18, 2), compareStep([25, 19, 'bigger'], 0), compareStep([30, 8, 'smaller'], 1),
  ]),
]

// ---------- unit 2: add and subtract ----------
const addSubUnit = [
  sumLesson('add_sub', 'add10', ['4 + 3 = ?', 7], [['3 + 4 = ?', 7], ['5 + 2 = ?', 7], ['6 + 3 = ?', 9], ['4 + 6 = ?', 10]], [['2 + 7 = ?', 9], ['5 + 5 = ?', 10]]),
  sumLesson('add_sub', 'add20', ['8 + 6 = ?', 14], [['10 + 5 = ?', 15], ['12 + 6 = ?', 18], ['9 + 8 = ?', 17], ['7 + 13 = ?', 20]], [['11 + 7 = ?', 18], ['14 + 5 = ?', 19]]),
  sumLesson('add_sub', 'sub10', ['7 − 2 = ?', 5], [['8 − 3 = ?', 5], ['9 − 4 = ?', 5], ['6 − 2 = ?', 4], ['10 − 7 = ?', 3]], [['7 − 5 = ?', 2], ['9 − 6 = ?', 3]]),
  sumLesson('add_sub', 'sub20', ['14 − 4 = ?', 10], [['15 − 5 = ?', 10], ['18 − 6 = ?', 12], ['20 − 8 = ?', 12], ['17 − 9 = ?', 8]], [['16 − 4 = ?', 12], ['14 − 6 = ?', 8]]),
  sumLesson('add_sub', 'add2', ['23 + 12 = ?', 35], [['21 + 14 = ?', 35], ['32 + 25 = ?', 57], ['40 + 30 = ?', 70], ['53 + 6 = ?', 59]], [['24 + 15 = ?', 39], ['61 + 28 = ?', 89]]),
  sumLesson('add_sub', 'sub2', ['57 − 23 = ?', 34], [['48 − 12 = ?', 36], ['75 − 25 = ?', 50], ['99 − 44 = ?', 55], ['67 − 7 = ?', 60]], [['58 − 23 = ?', 35], ['86 − 32 = ?', 54]]),
  sumLesson('add_sub', 'addc', ['18 + 15 = ?', 33], [['27 + 15 = ?', 42], ['38 + 24 = ?', 62], ['49 + 13 = ?', 62], ['56 + 27 = ?', 83]], [['19 + 16 = ?', 35], ['45 + 39 = ?', 84]]),
  sumLesson('add_sub', 'subb', ['52 − 17 = ?', 35], [['42 − 15 = ?', 27], ['63 − 28 = ?', 35], ['50 − 23 = ?', 27], ['71 − 46 = ?', 25]], [['34 − 17 = ?', 17], ['82 − 39 = ?', 43]]),
  checkLesson('add_sub', 'check_addsub', [['8 + 7 = ?', 15], ['14 − 6 = ?', 8], ['35 + 27 = ?', 62], ['61 − 34 = ?', 27]], [['9 + 9 = ?', 18], ['20 − 13 = ?', 7], ['46 + 25 = ?', 71], ['90 − 45 = ?', 45]]),
]

// ---------- unit 3: multiply and divide ----------
const multDivUnit = [
  sumLesson('mult_div', 'repeat', ['4 + 4 + 4 = ?', 12], [['2 + 2 + 2 = ?', 6], ['5 + 5 + 5 = ?', 15], ['3 + 3 + 3 + 3 = ?', 12], ['10 + 10 = ?', 20]], [['6 + 6 + 6 = ?', 18], ['2 + 2 + 2 + 2 + 2 = ?', 10]]),
  sumLesson('mult_div', 't2', ['2 × 6 = ?', 12], [['2 × 3 = ?', 6], ['2 × 5 = ?', 10], ['2 × 8 = ?', 16], ['2 × 10 = ?', 20]], [['2 × 4 = ?', 8], ['2 × 7 = ?', 14]]),
  sumLesson('mult_div', 't5', ['5 × 5 = ?', 25], [['5 × 2 = ?', 10], ['5 × 4 = ?', 20], ['5 × 6 = ?', 30], ['5 × 10 = ?', 50]], [['5 × 3 = ?', 15], ['5 × 8 = ?', 40]]),
  sumLesson('mult_div', 't10', ['10 × 6 = ?', 60], [['10 × 3 = ?', 30], ['10 × 7 = ?', 70], ['10 × 10 = ?', 100], ['10 × 5 = ?', 50]], [['10 × 4 = ?', 40], ['10 × 9 = ?', 90]]),
  sumLesson('mult_div', 't34', ['3 × 6 = ?', 18], [['3 × 3 = ?', 9], ['3 × 5 = ?', 15], ['4 × 4 = ?', 16], ['4 × 6 = ?', 24]], [['3 × 7 = ?', 21], ['4 × 5 = ?', 20]]),
  sumLesson('mult_div', 'share', ['8 ÷ 4 = ?', 2], [['6 ÷ 2 = ?', 3], ['10 ÷ 2 = ?', 5], ['12 ÷ 3 = ?', 4], ['15 ÷ 3 = ?', 5]], [['8 ÷ 2 = ?', 4], ['9 ÷ 3 = ?', 3]]),
  sumLesson('mult_div', 'div510', ['35 ÷ 5 = ?', 7], [['20 ÷ 5 = ?', 4], ['30 ÷ 5 = ?', 6], ['50 ÷ 10 = ?', 5], ['100 ÷ 10 = ?', 10]], [['25 ÷ 5 = ?', 5], ['40 ÷ 10 = ?', 4]]),
  checkLesson('mult_div', 'check_multdiv', [['3 × 4 = ?', 12], ['5 × 7 = ?', 35], ['18 ÷ 3 = ?', 6], ['60 ÷ 10 = ?', 6]], [['2 × 9 = ?', 18], ['4 × 8 = ?', 32], ['14 ÷ 2 = ?', 7], ['35 ÷ 5 = ?', 7]]),
]

// ---------- unit 4: money (Naira), measuring, everyday finance ----------
// ctx: a short line shown above each question so the plain sum has a real-life meaning (nc_<id> in the strings).
const moneyUnit = [
  sumLesson('money', 'naira', ['₦50 + ₦50 = ?', 100], [['₦100 + ₦100 + ₦50 = ?', 250], ['₦200 + ₦500 = ?', 700], ['₦1000 − ₦500 = ?', 500], ['₦20 + ₦20 + ₦10 = ?', 50]], [['₦500 + ₦100 = ?', 600], ['₦200 + ₦200 + ₦100 = ?', 500]], 'nc_naira'),
  sumLesson('money', 'pay', ['₦40 + ₦35 = ?', 75], [['₦30 + ₦20 = ?', 50], ['₦150 + ₦50 = ?', 200], ['₦75 + ₦25 = ?', 100], ['₦45 + ₦30 = ?', 75]], [['₦60 + ₦90 = ?', 150], ['₦250 + ₦150 = ?', 400]], 'nc_pay'),
  sumLesson('money', 'change', ['₦100 − ₦70 = ?', 30], [['₦100 − ₦60 = ?', 40], ['₦200 − ₦150 = ?', 50], ['₦500 − ₦350 = ?', 150], ['₦1000 − ₦700 = ?', 300]], [['₦100 − ₦35 = ?', 65], ['₦500 − ₦420 = ?', 80]], 'nc_change'),
  sumLesson('money', 'shop', ['2 × ₦50 = ?', 100], [['3 × ₦50 = ?', 150], ['4 × ₦100 = ?', 400], ['5 × ₦20 = ?', 100], ['2 × ₦250 = ?', 500]], [['6 × ₦50 = ?', 300], ['3 × ₦200 = ?', 600]], 'nc_shop'),
  sumLesson('money', 'profit', ['₦400 − ₦300 = ?', 100], [['₦700 − ₦500 = ?', 200], ['₦1500 − ₦1200 = ?', 300], ['₦950 − ₦800 = ?', 150], ['₦300 − ₦250 = ?', 50]], [['₦1000 − ₦850 = ?', 150], ['₦2000 − ₦1600 = ?', 400]], 'nc_profit'),
  sumLesson('money', 'measure', ['2 × 5 kg = ?', 10], [['5 kg + 5 kg + 5 kg = ?', 15], ['3 × 10 L = ?', 30], ['20 kg − 8 kg = ?', 12], ['20 L ÷ 4 = ?', 5]], [['4 × 5 kg = ?', 20], ['30 L ÷ 3 = ?', 10]], 'nc_measure'),
  sumLesson('money', 'save', ['3 × ₦100 = ?', 300], [['5 × ₦200 = ?', 1000], ['4 × ₦500 = ?', 2000], ['₦1000 + ₦500 = ?', 1500], ['₦5000 ÷ 5 = ?', 1000]], [['3 × ₦300 = ?', 900], ['₦6000 ÷ 3 = ?', 2000]], 'nc_save'),
  sumLesson('money', 'debt', ['₦3000 − ₦1000 = ?', 2000], [['₦5000 − ₦2000 = ?', 3000], ['₦10000 − ₦4000 = ?', 6000], ['₦3000 + ₦2000 = ?', 5000], ['₦8000 − ₦3500 = ?', 4500]], [['₦6000 − ₦2500 = ?', 3500], ['₦4000 + ₦1500 = ?', 5500]], 'nc_debt'),
  checkLesson('money', 'check_money', [['₦150 + ₦250 = ?', 400], ['₦500 − ₦275 = ?', 225], ['4 × ₦150 = ?', 600], ['₦900 ÷ 3 = ?', 300]], [['₦350 + ₦450 = ?', 800], ['₦1000 − ₦650 = ?', 350], ['5 × ₦120 = ?', 600], ['₦800 ÷ 4 = ?', 200]]),
]

export const UNITS = [
  { id: 'numbers', titleKey: 'unitNumbers', start: 'numbers', lessons: numbersUnit },
  { id: 'add_sub', titleKey: 'unitAddSub', start: 'add_sub', lessons: addSubUnit },
  { id: 'mult_div', titleKey: 'unitMultDiv', start: 'mult_div', lessons: multDivUnit },
  { id: 'money', titleKey: 'unitMoney', start: 'money', lessons: moneyUnit },
]
export const LESSONS = UNITS.flatMap((u) => u.lessons)
export const lessonByKey = (k) => LESSONS.find((l) => l.key === k) || null
export const nextLesson = (k) => { const i = LESSONS.findIndex((l) => l.key === k); return i >= 0 ? LESSONS[i + 1] || null : null }
export const isCheckLesson = (l) => l.id.startsWith('check_')
// Where a learner should start, from the assessment's advice (numeracy.start): the first lesson of that unit.
export function firstLessonFor(start) { return (UNITS.find((x) => x.start === start) || UNITS[0]).lessons[0] }
