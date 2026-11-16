import { pickVariants } from '../src/lib/variants.js'
let fail = 0
const eq = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? '✓' : '✗', n, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
const V = (id, no, minAge, family, risk = 'medium') => ({ id, no, minAge, family, risk })
const list = [V('d1', 7, 5, 'home-device'), V('d2', 15, 11, 'home-device'), V('d3', 16, 14, 'home-device'), V('cassava', 1, 5, null)]
const ids = (b) => pickVariants(list, b).map((m) => m.id)
eq('age 5-7 sees level 1 variant', ids('5-7'), ['d1', 'cassava'])
eq('age 8-10 sees level 1 variant', ids('8-10'), ['d1', 'cassava'])
eq('age 11-13 sees level 2 variant', ids('11-13'), ['d2', 'cassava'])
eq('age 14-17 sees level 3 variant', ids('14-17'), ['d3', 'cassava'])
eq('unknown age sees level 1 variant', ids(null), ['d1', 'cassava'])
eq('no family = untouched', pickVariants([V('a', 1, 5, null), V('b', 2, 14, null)], '5-7').length, 2)
eq('only an older variant exists = shown locked', pickVariants([V('x', 1, 14, 'f')], '5-7').map((m) => m.id), ['x'])
eq('high risk + unknown age falls back to youngest', pickVariants([V('h2', 1, 11, 'g', 'high'), V('h3', 2, 14, 'g', 'high')], null).map((m) => m.id), ['h2'])
eq('same level twice: the newer one wins', pickVariants([V('old', 7, 11, 'f'), V('new', 20, 11, 'f')], '11-13').map((m) => m.id), ['new'])
process.exit(fail ? 1 : 0)
