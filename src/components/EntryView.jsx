// Shows one portfolio entry. `pick` turns a {ha,en} text into the language to show (the learner's language, or English for staff).
export default function EntryView({ e, pick }) {
  const c = e.content || {}
  const tx = (o) => (typeof o === 'string' ? o : pick(o))
  if (e.kind === 'reflect') {
    return <div>{(c.answers || []).map((a, i) => <div key={i}><p className="small"><b>{tx(a.q)}</b></p><p>{a.a}</p></div>)}</div>
  }
  if (e.kind === 'predict') {
    return <div><p><b>{tx(c.question)}</b></p><p>{(c.options || []).map((o, i) => <span key={i}>{i === c.pick ? '👉 ' : ''}{tx(o)}{i < c.options.length - 1 ? ' · ' : ''}</span>)}</p><p>{c.right ? '✅' : '❌'}</p></div>
  }
  if (e.kind === 'simulate') {
    return (
      <div><p><b>{tx(c.title)}</b></p>
        <div style={{ overflowX: 'auto' }}><table className="tbl"><tbody>{(c.runs || []).map((r, i) => (
          <tr key={i}><td>{i + 1}</td><td>{(r.settings || []).map((s) => tx(s.choice)).join(' · ')}</td><td><b>{r.value} {c.unit}</b>{i === c.best ? ' ⭐' : ''}</td></tr>
        ))}</tbody></table></div></div>
    )
  }
  if (e.kind === 'business') {
    const r = c.result || {}
    return (
      <div>
        <p>{(c.materials || []).map((m) => `${m.name || '—'}: ₦${m.cost}`).join(' · ')}</p>
        <p>One-off ₦{c.fixed} · Price ₦{c.price} · Units {c.units}</p>
        <p>Unit cost ₦{r.unitCost} · Total ₦{r.total} · Revenue ₦{r.revenue} · Profit ₦{r.profit} · Break-even {r.breakEven === null || r.breakEven === undefined ? '—' : r.breakEven}</p>
      </div>
    )
  }
  return null
}
