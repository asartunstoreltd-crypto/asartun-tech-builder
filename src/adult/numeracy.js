// Course B — Basic Numeracy. Data in code (like curriculum.js) so it can be reviewed in one place and tested:
// scripts/test-adult.mjs recomputes every answer independently.   STATUS: Hausa wording is a DRAFT for native review.
//
// Step types used here (the player is in pages/Lessons.jsx):
//   teach  digit | concept (+ a fully worked example)     show/trace/write  digits, as for letters
//   calc   a problem the learner solves by WRITING the answer with a finger; the app then shows the correct answer and the
//          learner (or facilitator) says whether it was the same.  Handwriting is not recognised, so this is a self-check.
//   pick   multiple choice, marked automatically (counting, comparing, choosing an answer)
//   review summary; progress saved
export const COURSE_SLUG = 'basic-numeracy'
export const NUMBER_WORDS = ['sifili', 'ɗaya', 'biyu', 'uku', 'huɗu', 'biyar', 'shida', 'bakwai', 'takwas', 'tara', 'goma']

// An "item" is one calculation: nums chained with one operator, e.g. {nums:[10,5], op:'+'}.
// money: 'none' | 'all' (₦ on every number) | 'first' | 'last';  unit: 'kg' | 'l' | 'm' | ''.
export function evalItem(item) {
  const [first, ...rest] = item.nums
  return rest.reduce((a, n) => (item.op === '+' ? a + n : item.op === '−' ? a - n : item.op === '×' ? a * n : a / n), first)
}
export function formatItem(item) {
  const money = item.money || 'none', unit = item.unit ? ' ' + item.unit : ''
  const n = item.nums.length
  const shown = item.nums.map((v, i) => {
    const naira = money === 'all' || (money === 'first' && i === 0) || (money === 'last' && i === n - 1)
    const withUnit = unit && (item.op === '+' || item.op === '−' || i === 0)
    return (naira ? '₦' : '') + v + (withUnit ? unit : '')
  })
  const answer = evalItem(item)
  const resultMoney = money !== 'none'
  const resultUnit = unit && (item.op === '+' || item.op === '−' || item.op === '×' || item.op === '÷') ? unit : ''
  const expr = shown.join(' ' + item.op + ' ')
  return { expr: expr + ' = ?', full: expr + ' = ' + (resultMoney ? '₦' : '') + answer + (resultMoney ? '' : resultUnit), answer: String(answer), textKey: item.textKey || null, vars: item.vars || null }
}

const I = (op, nums, money = 'none', unit = '') => ({ op, nums, money, unit })
const C = (textKey, op, names, money) => (nums) => ({ op, nums, money, unit: '', textKey, vars: Object.fromEntries(names.map((k, i) => [k, nums[i]])) })
const rot = (arr, n) => arr.map((_, i) => arr[(i + n) % arr.length])

function pickAnswerStep(item, seed) {
  const a = evalItem(item)
  const near = [a + 1, a - 1, a + 10, a - 10, a * 2, a + 2].filter((x) => x >= 0 && x !== a)
  const d = [...new Set(near)].slice(0, 3).map(String)
  return { type: 'pick', promptKey: 'pickAnswer', problem: item, options: rot([String(a), ...d], seed % 4), target: String(a) }
}
function calcLesson(key, unit, titleKey, conceptKey, items) {
  return {
    key, unit, title: { key: titleKey, vars: {} },
    steps: [
      { type: 'teach', kind: 'concept', conceptKey, worked: items[0] },
      { type: 'calc', item: items[1] }, { type: 'calc', item: items[2] }, { type: 'calc', item: items[3] },
      pickAnswerStep(items[4], key.length),
      { type: 'review' },
    ],
  }
}
const pairs = (op, list, money = 'none', unit = '') => list.map((n) => I(op, n, money, unit))

// ---- numbers ----
const digitLesson = (n) => ({
  key: 'n-digit-' + n, unit: 'numbers', title: { key: 'lessonDigitTitle', vars: { n } },
  steps: [
    { type: 'teach', kind: 'digit', n, word: NUMBER_WORDS[n] },
    { type: 'show', text: String(n) }, { type: 'trace', text: String(n) }, { type: 'write', text: String(n) },
    n === 0
      ? { type: 'pick', promptKey: 'pickNone', options: ['0', '1', '5', '8'], target: '0' }
      : { type: 'pick', promptKey: 'pickCount', dots: n, options: rot([String(n), ...[n + 1, n + 2, Math.max(0, n - 1)].filter((x) => x !== n).map(String).slice(0, 3)], n % 4), target: String(n) },
    { type: 'review' },
  ],
})
const pickLesson = (key, unit, titleKey, conceptKey, picks, extra = []) => ({
  key, unit, title: { key: titleKey, vars: {} },
  steps: [{ type: 'teach', kind: 'concept', conceptKey }, ...extra, ...picks, { type: 'review' }],
})
const bigger = (x, y, seed) => ({ type: 'pick', promptKey: 'pickBigger', options: rot([String(x), String(y)], seed % 2), target: String(Math.max(x, y)) })
const smaller = (x, y, seed) => ({ type: 'pick', promptKey: 'pickSmaller', options: rot([String(x), String(y)], seed % 2), target: String(Math.min(x, y)) })
const biggest = (a, seed) => ({ type: 'pick', promptKey: 'pickBiggest', options: rot(a.map(String), seed % 3), target: String(Math.max(...a)) })
const naira = (a, b, which, seed) => ({ type: 'pick', promptKey: which === 'big' ? 'pickBigger' : 'pickSmaller', options: rot(['₦' + a, '₦' + b], seed % 2), target: '₦' + (which === 'big' ? Math.max(a, b) : Math.min(a, b)) })
const numberPick = (n, wrong, seed) => ({ type: 'pick', promptKey: 'pickNumber', vars: { n }, options: rot([String(n), ...wrong.map(String)], seed % 4), target: String(n) })

export const UNITS = [
  { id: 'numbers', titleKey: 'unitNumbers', start: 'numbers', lessons: [
    ...Array.from({ length: 10 }, (_, n) => digitLesson(n)),
    { key: 'n-count-10', unit: 'numbers', title: { key: 'nl_count', vars: {} }, steps: [
      { type: 'teach', kind: 'concept', conceptKey: 'conceptCount' },
      { type: 'pick', promptKey: 'pickCount', dots: 6, options: ['4', '6', '7', '9'], target: '6' }, { type: 'pick', promptKey: 'pickCount', dots: 8, options: ['8', '5', '10', '7'], target: '8' }, { type: 'pick', promptKey: 'pickCount', dots: 9, options: ['6', '8', '9', '10'], target: '9' },
      { type: 'review' }] },
    { key: 'n-teens', unit: 'numbers', title: { key: 'nl_teens', vars: {} }, steps: [
      { type: 'teach', kind: 'concept', conceptKey: 'conceptTwoDigit' }, { type: 'trace', text: '12' }, { type: 'write', text: '15' }, numberPick(15, [51, 10, 5], 1), { type: 'review' }] },
    { key: 'n-tens', unit: 'numbers', title: { key: 'nl_tens', vars: {} }, steps: [
      { type: 'teach', kind: 'concept', conceptKey: 'conceptTens' }, { type: 'trace', text: '40' }, { type: 'write', text: '90' }, numberPick(60, [16, 66, 600], 2), { type: 'review' }] },
    { key: 'n-hundred', unit: 'numbers', title: { key: 'nl_hundred', vars: {} }, steps: [
      { type: 'teach', kind: 'concept', conceptKey: 'conceptHundred' }, { type: 'trace', text: '100' }, { type: 'write', text: '100' }, numberPick(100, [10, 1000, 110], 3), { type: 'review' }] },
  ] },
  { id: 'compare', titleKey: 'unitCompare', start: 'numbers', lessons: [
    pickLesson('n-cmp-small', 'compare', 'nl_cmp_small', 'conceptCompare', [bigger(7, 3, 0), bigger(2, 9, 1), smaller(8, 5, 2), smaller(1, 6, 3)]),
    pickLesson('n-cmp-two', 'compare', 'nl_cmp_two', 'conceptCompare', [bigger(45, 54, 0), bigger(82, 28, 1), smaller(67, 76, 2), smaller(90, 19, 3)]),
    pickLesson('n-cmp-big', 'compare', 'nl_cmp_big', 'conceptCompare', [biggest([12, 31, 21], 0), biggest([40, 14, 41], 1), biggest([56, 65, 49], 2)]),
  ] },
  { id: 'add_sub', titleKey: 'unitAddSub', start: 'add_sub', lessons: [
    calcLesson('n-add-5', 'add_sub', 'nl_add5', 'conceptAdd', pairs('+', [[2, 1], [3, 2], [1, 4], [2, 2], [4, 1]])),
    calcLesson('n-add-10', 'add_sub', 'nl_add10', 'conceptAdd', pairs('+', [[5, 3], [6, 3], [4, 5], [7, 2], [8, 2]])),
    calcLesson('n-add-20', 'add_sub', 'nl_add20', 'conceptAdd', pairs('+', [[10, 5], [12, 6], [9, 8], [14, 3], [11, 7]])),
    calcLesson('n-add-carry', 'add_sub', 'nl_add_carry', 'conceptAdd', pairs('+', [[25, 16], [38, 27], [19, 14], [46, 29], [57, 26]])),
    calcLesson('n-sub-5', 'add_sub', 'nl_sub5', 'conceptSub', pairs('−', [[5, 2], [4, 1], [5, 3], [3, 3], [5, 4]])),
    calcLesson('n-sub-10', 'add_sub', 'nl_sub10', 'conceptSub', pairs('−', [[9, 4], [10, 6], [8, 5], [7, 2], [10, 3]])),
    calcLesson('n-sub-20', 'add_sub', 'nl_sub20', 'conceptSub', pairs('−', [[15, 7], [20, 8], [18, 9], [16, 4], [19, 6]])),
    calcLesson('n-sub-borrow', 'add_sub', 'nl_sub_borrow', 'conceptSub', pairs('−', [[42, 17], [50, 23], [35, 18], [61, 24], [70, 45]])),
  ] },
  { id: 'mult_div', titleKey: 'unitMultDiv', start: 'mult_div', lessons: [
    calcLesson('n-times-2', 'mult_div', 'nl_x2', 'conceptMul', pairs('×', [[2, 3], [2, 5], [2, 7], [2, 4], [2, 9]])),
    calcLesson('n-times-5', 'mult_div', 'nl_x5', 'conceptMul', pairs('×', [[5, 2], [5, 4], [5, 6], [5, 3], [5, 8]])),
    calcLesson('n-times-10', 'mult_div', 'nl_x10', 'conceptMul', pairs('×', [[10, 3], [10, 5], [10, 7], [10, 9], [10, 4]])),
    calcLesson('n-times-mix', 'mult_div', 'nl_xmix', 'conceptMul', pairs('×', [[3, 4], [6, 3], [4, 7], [8, 5], [9, 3]])),
    calcLesson('n-share-2', 'mult_div', 'nl_d2', 'conceptDiv', pairs('÷', [[8, 2], [6, 2], [10, 2], [12, 2], [14, 2]])),
    calcLesson('n-share-5', 'mult_div', 'nl_d5', 'conceptDiv', pairs('÷', [[20, 5], [15, 5], [35, 5], [10, 5], [25, 5]])),
    calcLesson('n-share-mix', 'mult_div', 'nl_dmix', 'conceptDiv', pairs('÷', [[12, 3], [18, 6], [24, 4], [30, 10], [36, 6]])),
  ] },
  { id: 'money', titleKey: 'unitMoney', start: 'money', lessons: [
    pickLesson('n-naira', 'money', 'nl_naira', 'conceptNaira', [naira(200, 500, 'big', 0), naira(1000, 100, 'big', 1), naira(50, 200, 'small', 2), naira(500, 100, 'small', 3)]),
    calcLesson('n-money-add', 'money', 'nl_madd', 'conceptMoneyAdd', pairs('+', [[100, 50], [200, 300], [150, 250], [500, 500], [350, 150]], 'all')),
    calcLesson('n-money-sub', 'money', 'nl_msub', 'conceptSub', pairs('−', [[500, 200], [1000, 400], [300, 150], [700, 350], [1000, 250]], 'all')),
    calcLesson('n-change', 'money', 'nl_change', 'conceptChange', [[500, 350], [1000, 650], [200, 120], [1000, 850], [500, 275]].map(C('changeQ', '−', ['pay', 'cost'], 'all'))),
    calcLesson('n-money-total', 'money', 'nl_mtotal', 'conceptTotal', [[200, 150, 100], [50, 50, 200], [300, 100, 150], [500, 250, 250], [120, 80, 300]].map((n) => I('+', n, 'all'))),
    calcLesson('n-money-times', 'money', 'nl_mtimes', 'conceptMoneyTimes', pairs('×', [[3, 200], [5, 100], [4, 250], [2, 450], [6, 50]], 'last')),
    calcLesson('n-money-share', 'money', 'nl_mshare', 'conceptShare', pairs('÷', [[600, 3], [1000, 5], [800, 4], [900, 3], [1200, 6]], 'first')),
  ] },
  { id: 'measure', titleKey: 'unitMeasure', start: 'money', lessons: [
    calcLesson('n-measure-kg', 'measure', 'nl_kg', 'conceptKg', [I('+', [2, 3], 'none', 'kg'), I('+', [5, 4], 'none', 'kg'), I('−', [10, 3], 'none', 'kg'), I('×', [4, 3], 'none', 'kg'), I('÷', [12, 4], 'none', 'kg')]),
    calcLesson('n-measure-litre', 'measure', 'nl_litre', 'conceptLitre', [I('+', [5, 2], 'none', 'l'), I('−', [10, 4], 'none', 'l'), I('×', [3, 2], 'none', 'l'), I('÷', [8, 2], 'none', 'l'), I('+', [7, 6], 'none', 'l')]),
    calcLesson('n-measure-metre', 'measure', 'nl_metre', 'conceptMetre', [I('+', [6, 4], 'none', 'm'), I('−', [12, 5], 'none', 'm'), I('×', [2, 5], 'none', 'm'), I('÷', [20, 4], 'none', 'm'), I('+', [15, 8], 'none', 'm')]),
  ] },
  { id: 'finance', titleKey: 'unitFinance', start: 'money', lessons: [
    calcLesson('n-profit', 'finance', 'nl_profit', 'conceptProfit', [[800, 500], [1500, 1000], [2400, 1800], [600, 350], [3000, 2200]].map(C('profitQ', '−', ['sell', 'cost'], 'all'))),
    calcLesson('n-savings', 'finance', 'nl_savings', 'conceptSavings', [[200, 4], [500, 3], [100, 10], [250, 4], [150, 6]].map(C('saveQ', '×', ['amount', 'weeks'], 'first'))),
  ] },
]
export const LESSONS = UNITS.flatMap((u) => u.lessons)
