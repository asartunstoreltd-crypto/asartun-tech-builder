import { computeBusiness } from '../src/lib/business.js'
let fail = 0
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? '✓' : '✗', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
eq('empty form is not valid', computeBusiness({ raw: '', proc: '', pack: '', price: '' }), { total: 0, profit: 0, valid: false })
eq('costs but no price is not valid', computeBusiness({ raw: '100', proc: '', pack: '', price: '' }).valid, false)
eq('price but no costs is not valid', computeBusiness({ raw: '', proc: '', pack: '', price: '500' }).valid, false)
eq('profit sum', computeBusiness({ raw: '200', proc: '100', pack: '50', price: '500' }), { total: 350, profit: 150, valid: true })
eq('loss sum', computeBusiness({ raw: '400', proc: '100', pack: '50', price: '300' }), { total: 550, profit: -250, valid: true })
eq('negatives and junk count as 0', computeBusiness({ raw: '-5', proc: 'abc', pack: '10', price: '30' }), { total: 10, profit: 20, valid: true })
process.exit(fail ? 1 : 0)
