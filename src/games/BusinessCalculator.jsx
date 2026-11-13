import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
const fields = [['raw', 'raw'], ['proc', 'proc'], ['pack', 'pack'], ['price', 'price']]

export default function BusinessCalculator({ onDone }) {
  const { t } = useLang()
  const [v, setV] = useState({ raw: '', proc: '', pack: '', price: '' })
  const [res, setRes] = useState(null)
  const calc = () => {
    const n = (k) => Math.max(0, parseFloat(v[k]) || 0)
    const total = n('raw') + n('proc') + n('pack')
    setRes({ total, profit: n('price') - total })
    onDone()
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
      {res && (
        <div className="result">
          <p>{t('totalLine')}: <b>₦{res.total}</b></p>
          <p>{t('profitLine')}: <b className={res.profit >= 0 ? 'good' : 'bad'}>₦{res.profit}</b></p>
          <p>{res.profit > 0 ? t('profitMsg') : res.profit === 0 ? t('evenMsg') : t('lossMsg')}</p>
        </div>
      )}
    </div>
  )
}
