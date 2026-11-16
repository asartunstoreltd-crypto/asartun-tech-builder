import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { computePlan } from '../lib/business.js'

// Business plan: unit cost from a list of materials, one-off cost, selling price, units -> total cost, revenue, profit, break-even.
// Points only for a real attempt (see computePlan.valid). The child's own numbers are saved to the portfolio.
export default function BusinessPlan({ onDone, save }) {
  const { t } = useLang()
  const [mats, setMats] = useState([{ name: '', cost: '' }, { name: '', cost: '' }])
  const [v, setV] = useState({ fixed: '', price: '', units: '' })
  const [res, setRes] = useState(null)
  const calc = () => {
    const r = computePlan({ materials: mats, ...v })
    setRes(r)
    if (r.valid) {
      if (save) save({ materials: mats.filter((m) => m.name || m.cost).map((m) => ({ name: String(m.name).slice(0, 60), cost: Number(m.cost) || 0 })), fixed: r.fixed, price: r.price, units: r.units, result: { unitCost: r.unitCost, total: r.total, revenue: r.revenue, profit: r.profit, breakEven: r.breakEven } })
      onDone()
    }
  }
  const setMat = (i, p) => setMats(mats.map((m, j) => (j === i ? { ...m, ...p } : m)))
  return (
    <div className="card">
      <h3>{t('planTitle')}</h3>
      <p><b>{t('planMat')}</b></p>
      {mats.map((m, i) => (
        <div className="two" key={i}>
          <input type="text" maxLength={60} placeholder={t('planName')} value={m.name} onChange={(e) => setMat(i, { name: e.target.value })} />
          <input type="number" min="0" inputMode="decimal" placeholder={t('planCost')} value={m.cost} onChange={(e) => setMat(i, { cost: e.target.value })} />
        </div>
      ))}
      {mats.length < 6 && <button className="btn ghost" onClick={() => setMats([...mats, { name: '', cost: '' }])}>{t('planAdd')}</button>}
      {[['fixed', 'planFixed'], ['price', 'planPrice'], ['units', 'planUnits']].map(([k, label]) => (
        <label className="field" key={k}>{t(label)}
          <input type="number" min="0" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        </label>
      ))}
      <button className="btn" onClick={calc}>{t('calc')}</button>
      {res && !res.valid && <p className="bad">{t('planNeed')}</p>}
      {res && res.valid && (
        <div className="result">
          <p>{t('planUnitCost')}: <b>₦{res.unitCost}</b></p>
          <p>{t('planTotal')}: <b>₦{res.total}</b></p>
          <p>{t('planRevenue')}: <b>₦{res.revenue}</b></p>
          <p>{t('planProfit')}: <b className={res.profit >= 0 ? 'good' : 'bad'}>₦{res.profit}</b></p>
          {res.belowCost ? <p className="bad">{t('planBelow')}</p> : <p>{t('planBreak')}: <b>{res.breakEven} {t('planBreakUnits')}</b></p>}
        </div>
      )}
    </div>
  )
}
