import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { computeBusiness } from '../lib/business.js'
const fields = [['raw', 'raw'], ['proc', 'proc'], ['pack', 'pack'], ['price', 'price']]

export default function BusinessCalculator({ onDone }) {
  const { t } = useLang()
  const [v, setV] = useState({ raw: '', proc: '', pack: '', price: '' })
  const [res, setRes] = useState(null)
  const calc = () => {
    const r = computeBusiness(v)
    setRes(r)
    if (r.valid) onDone()      // points only for a real attempt (a price and at least one cost)
  }
  return (
    <div className="card">
      <h3>{t('bizTitle')}</h3>
      <div className="formula"><b>{t('formulaTitle')}</b><p>{t('formulaTotal')}</p><p>{t('formulaProfit')}</p><p className="small">{t('formulaEx')}</p></div>
      {fields.map(([k, key]) => (
        <label key={k} className="field">{t(key)}
          <input type="number" min="0" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        </label>
      ))}
      <button className="btn" onClick={calc}>{t('calc')}</button>
      {res && !res.valid && <p className="bad">{t('bizNeed')}</p>}
      {res && res.valid && (
        <div className="result">
          <p>{t('totalLine')}: <b>₦{res.total}</b></p>
          <p>{t('profitLine')}: <b className={res.profit >= 0 ? 'good' : 'bad'}>₦{res.profit}</b></p>
          <p>{res.profit > 0 ? t('profitMsg') : res.profit === 0 ? t('evenMsg') : t('lossMsg')}</p>
        </div>
      )}
    </div>
  )
}
