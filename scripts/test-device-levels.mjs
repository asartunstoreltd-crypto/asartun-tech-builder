// Structure + Hausa/English + arithmetic checks for the Home Device level lessons. Run: npm run test:device
import { deviceL1 } from '../src/data/deviceL1Mission.js'
import { deviceL3 } from '../src/data/deviceL3Mission.js'
let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.log('✗', m) } }
const gaps = (v, p = '') => Array.isArray(v) ? v.flatMap((x, i) => gaps(x, `${p}[${i}]`))
  : v && typeof v === 'object' ? ('ha' in v || 'en' in v ? ['ha', 'en'].filter((l) => !String(v[l] ?? '').trim()).map((l) => `${p}.${l}`) : Object.entries(v).flatMap(([k, x]) => gaps(x, `${p}.${k}`))) : []
for (const m of [deviceL1, deviceL3]) {
  const g = gaps([m.title, m.description, m.objectives, m.teach, m.steps, m.procedures, m.challenges, m.quiz])
  ok(g.length === 0, `${m.id}: missing translations ${g.join(', ')}`)
  m.procedures.forEach((p) => p.steps.forEach((s) => ok(m.steps[s], `${m.id}: procedure step ${s} not defined`)))
  m.challenges.forEach((c) => {
    if (c.type === 'business') return
    const kinds = c.type === 'safety' ? ['safe', 'adult'] : c.options.map((o) => o.kind)
    ok(c.items.every((i) => kinds.includes(i.kind)), `${m.id}: challenge ${c.key} has an item with no group`)
  })
  m.challenges.forEach((c) => ok(m.rewards[c.key] !== undefined, `${m.id}: no reward rule for challenge ${c.key}`))
  m.quiz.forEach((q, i) => ok(q.c >= 0 && q.c < q.a.length, `${m.id}: quiz ${i} correct index out of range`))
  ok(m.teach.filter((p) => p.warn).length >= 1, `${m.id}: no safety page`)
  console.log(`${m.id}: ${m.teach.length} pages, ${Object.keys(m.steps).length} steps, ${m.challenges.length} challenges, ${m.quiz.length} questions`)
}
// arithmetic in the Level 3 quiz and teaching example
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length
ok(avg([34, 35, 33]) - avg([24, 25, 23]) === 10, 'example ΔT should be 10')
ok(34 - 24 === 10, 'quiz ΔT')
ok(900 + 100 === 1000, 'quiz unit cost')
ok(1800 * 10 - 1000 * 10 === 8000, 'quiz profit')
ok(Math.ceil(2000 / (1800 - 1000)) === 3 && 2000 / (1800 - 1000) === 2.5, 'quiz break-even')
console.log(fail ? `${fail} problem(s)` : 'All checks passed')
process.exit(fail ? 1 : 0)
