// Checks every mission's data BEFORE it reaches children: Hausa + English everywhere, every step exists,
// every answer / group is valid, every reward key exists. Run:  node scripts/check-missions.mjs
import { cassavaMission } from '../src/data/cassavaMission.js'
import { potatoMission } from '../src/data/potatoMission.js'
import { wasteMission } from '../src/data/wasteMission.js'
import { compostMission } from '../src/data/compostMission.js'
import { solarMission } from '../src/data/solarMission.js'
import { robotMission } from '../src/data/robotMission.js'
import { deviceMission } from '../src/data/deviceMission.js'

const all = [cassavaMission, potatoMission, wasteMission, compostMission, solarMission, robotMission, deviceMission]
const gaps = (v, p = '') => Array.isArray(v) ? v.flatMap((x, i) => gaps(x, `${p}[${i}]`))
  : v && typeof v === 'object' ? ('ha' in v || 'en' in v ? ['ha', 'en'].filter((l) => !String(v[l] ?? '').trim()).map((l) => `${p}.${l}`) : Object.entries(v).flatMap(([k, x]) => gaps(x, `${p}.${k}`))) : []
const builtin = { sort: ['resource', 'product'], safety: ['safe', 'adult'] }
let bad = 0
const err = (m, s) => { bad++; console.log(`✗ ${m.id}: ${s}`) }
for (const m of all) {
  gaps([m.title, m.teach, m.steps, m.procedures, m.challenges, m.quiz], m.id).forEach((g) => err(m, 'missing translation ' + g))
  for (const p of m.procedures) for (const s of p.steps) if (!m.steps[s]) err(m, `procedure ${p.id} uses unknown step ${s}`)
  for (const p of m.procedures) if (new Set(p.steps).size !== p.steps.length) err(m, `procedure ${p.id} repeats a step`)
  const keys = m.challenges.map((c) => c.key)
  if (new Set(keys).size !== keys.length) err(m, 'duplicate challenge key')
  for (const c of m.challenges) {
    if (m.rewards[c.key] === undefined) err(m, `no reward for challenge ${c.key}`)
    if (c.type === 'business') continue
    const kinds = c.options ? c.options.map((o) => o.kind) : builtin[c.type]
    if (!kinds) err(m, `unknown challenge type ${c.type}`)
    if (c.options && !c.ask) err(m, `challenge ${c.key} has groups but no question`)
    c.items.forEach((i, n) => { if (!kinds.includes(i.kind)) err(m, `challenge ${c.key} item ${n} has unknown group ${i.kind}`) })
    if (new Set(c.items.map((i) => i.kind)).size < 2) err(m, `challenge ${c.key} uses only one group`)
  }
  for (const k of ['teach', 'show', 'practice', 'quiz', 'finish']) if (m.rewards[k] === undefined) err(m, `no reward ${k}`)
  m.quiz.forEach((q, i) => { if (!(q.c >= 0 && q.c < q.a.length)) err(m, `quiz ${i} has a wrong correct index`) })
  console.log(`✓ ${m.id}: ${m.teach.length} learn pages, ${m.procedures.length} processes, ${m.challenges.length} challenges, ${m.quiz.length} questions`)
}
console.log(bad ? `\n${bad} problem(s)` : '\nAll missions are complete.')
process.exitCode = bad ? 1 : 0
