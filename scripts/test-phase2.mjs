import { runSim, bestIndex, comboId, comboCount } from '../src/lib/sim.js'
import { computePlan } from '../src/lib/business.js'
let fail = 0
const eq = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? '✓' : '✗', n, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
const def = { base: 36, better: 'low', vars: [
  { key: 'place', options: [{ id: 'shade', effect: -3 }, { id: 'sun', effect: 4 }] },
  { key: 'sand', options: [{ id: 'wet', effect: -8 }, { id: 'dry', effect: 0 }] }] }
eq('shade + wet', runSim(def, { place: 'shade', sand: 'wet' }), 25)
eq('sun + dry', runSim(def, { place: 'sun', sand: 'dry' }), 40)
eq('unknown option gives null', runSim(def, { place: 'moon', sand: 'wet' }), null)
eq('combo id', comboId(def, { place: 'sun', sand: 'wet' }), 'sun|wet')
eq('combo count', comboCount(def), 4)
const runs = [{ value: 40 }, { value: 25 }, { value: 28 }]
eq('best is lowest when better=low', bestIndex(def, runs), 1)
eq('best is highest when better=high', bestIndex({ ...def, better: 'high' }, runs), 0)
eq('no runs', bestIndex(def, []), -1)
const p = computePlan({ materials: [{ cost: '900' }, { cost: '100' }], fixed: '2000', price: '1800', units: '10' })
eq('plan unit cost', p.unitCost, 1000)
eq('plan profit', p.profit, 1800 * 10 - (2000 + 1000 * 10))
eq('plan break-even', p.breakEven, 3)
eq('plan valid', p.valid, true)
eq('price below unit cost', computePlan({ materials: [{ cost: '500' }], fixed: '0', price: '400', units: '5' }).breakEven, null)
eq('price below unit cost flagged', computePlan({ materials: [{ cost: '500' }], fixed: '0', price: '400', units: '5' }).belowCost, true)
eq('empty plan is not valid', computePlan({ materials: [{ cost: '' }], fixed: '', price: '', units: '' }).valid, false)
eq('negative values count as 0', computePlan({ materials: [{ cost: '-50' }, { cost: '20' }], fixed: '-1', price: '30', units: '2.9' }).unitCost, 20)
eq('units are whole numbers', computePlan({ materials: [{ cost: '20' }], fixed: '0', price: '30', units: '2.9' }).units, 2)
process.exit(fail ? 1 : 0)
