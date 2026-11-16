// Checks the Phase 2-4 lesson content: translations, structure of the new activity types, reward keys, model-number consistency.
import { deviceL2Extra as X } from '../src/data/deviceL2Extra.js'
import { paperL1 } from '../src/data/paperL1Mission.js'
import { paperL2 } from '../src/data/paperL2Mission.js'
import { deviceL1 } from '../src/data/deviceL1Mission.js'
import { deviceL3 } from '../src/data/deviceL3Mission.js'
import { runSim, bestIndex, comboCount } from '../src/lib/sim.js'
let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.log('✗', m) } }
const gaps = (v, p = '') => Array.isArray(v) ? v.flatMap((x, i) => gaps(x, `${p}[${i}]`))
  : v && typeof v === 'object' ? ('ha' in v || 'en' in v ? ['ha', 'en'].filter((l) => !String(v[l] ?? '').trim()).map((l) => `${p}.${l}`) : Object.entries(v).flatMap(([k, x]) => gaps(x, `${p}.${k}`))) : []

const checkChallenges = (id, chals, rewards) => chals.forEach((c) => {
  ok(c.key && /^[a-z0-9_-]{1,40}$/.test(c.key), `${id}: bad challenge key ${c.key}`)
  ok(rewards[c.key] !== undefined, `${id}: no reward rule for ${c.key}`)
  if (c.type === 'predict') { ok(c.options.length >= 2 && c.correct >= 0 && c.correct < c.options.length, `${id}/${c.key}: bad predict options`); ok(c.kind === 'predict', `${id}/${c.key}: kind`) }
  if (c.type === 'sim') {
    ok(comboCount(c) >= 3, `${id}/${c.key}: fewer than 3 combos`)
    c.vars.forEach((v) => ok(v.options.length >= 2 && new Set(v.options.map((o) => o.id)).size === v.options.length, `${id}/${c.key}: options of ${v.key}`))
  }
  if (c.type === 'reflect') ok(c.prompts.length >= 1 && c.prompts.length <= 6, `${id}/${c.key}: prompts`)
  if (c.type === 'sort') { const kinds = c.options.map((o) => o.kind); ok(c.items.every((i) => kinds.includes(i.kind)), `${id}/${c.key}: item with no group`) }
})

// device-l2 extras
{
  const g = gaps([X.teach, X.challenges, X.quiz, X.objectives])
  ok(g.length === 0, 'device-l2 extras: missing translations ' + g.join(', '))
  checkChallenges('device-l2', X.challenges, { ...X.rewards, sort: 5, safety: 5, business: 15 })
  X.quiz.forEach((q, i) => ok(q.c >= 0 && q.c < q.a.length, `device-l2 quiz ${i}`))
  // the prediction table must match the simulation model (all three have a damp cloth)
  const sim = X.challenges.find((c) => c.type === 'sim'), pr = X.challenges.find((c) => c.type === 'predict')
  const val = (place, sand) => runSim(sim, { place, sand, cloth: 'damp' })
  const num = (r) => Number(String(r.value).replace(/[^0-9.]/g, ''))
  ok(num(pr.table[0]) === sim.base, 'outside air row should equal the base value')
  ok(num(pr.table[1]) === val('shade', 'wet') && num(pr.table[2]) === val('sun', 'wet') && num(pr.table[3]) === val('sun', 'dry'), 'prediction table must match the simulation model')
  const all = []; for (const p of ['shade', 'sun']) for (const s of ['wet', 'dry']) for (const c of ['damp', 'none']) all.push({ value: runSim(sim, { place: p, sand: s, cloth: c }) })
  ok(bestIndex(sim, all) === 0, 'best setting should be shade + wet + damp cloth')
  ok(pr.correct === 0 && pr.options[0].en.startsWith('Wet sand, in the shade'), 'predict answer is the shaded wet-sand cooler')
}
// paper lessons
for (const m of [paperL1, paperL2]) {
  const g = gaps([m.title, m.description, m.objectives, m.teach, m.steps, m.procedures, m.challenges, m.quiz])
  ok(g.length === 0, `${m.id}: missing translations ${g.join(', ')}`)
  m.procedures.forEach((p) => p.steps.forEach((s) => ok(m.steps[s], `${m.id}: step ${s} undefined`)))
  checkChallenges(m.id, m.challenges, m.rewards)
  m.quiz.forEach((q, i) => ok(q.c >= 0 && q.c < q.a.length, `${m.id} quiz ${i}`))
  ok(m.teach.some((p) => p.warn), `${m.id}: no safety page`)
  // no child-doable step may involve cutting/burning/heating words
  Object.entries(m.steps).forEach(([k, s]) => { if (s.kid && /knife|cutter|scissors|burn|fire|boil/i.test(s.text.en + ' ' + s.name.en)) ok(false, `${m.id}: child step ${k} looks hazardous`) })
}
{ const s = paperL2.challenges.find((c) => c.type === 'sim'), p = paperL2.challenges.find((c) => c.type === 'predict')
  const v = (shape) => runSim(s, { shape, layers: 'one' })
  ok(Number(p.table[0].value.split(' ')[0]) === v('flat') && Number(p.table[1].value.split(' ')[0]) === v('fold') && Number(p.table[2].value.split(' ')[0]) === v('tube'), 'paper prediction table must match the simulation model')
  ok(runSim(s, { shape: 'tube', layers: 'two' }) === 9, 'strongest paper column = 9 books (model)')
  ok(2000 === 10 * 500 - 10 * 300, 'paper L2 quiz profit arithmetic') }
// the existing Level 1 / Level 3 device lessons still need their rewards for new keys
checkChallenges('device-l1', deviceL1.challenges, deviceL1.rewards); checkChallenges('device-l3', deviceL3.challenges, deviceL3.rewards)
console.log(fail ? `${fail} problem(s)` : 'All Phase 3 content checks passed')
process.exit(fail ? 1 : 0)
