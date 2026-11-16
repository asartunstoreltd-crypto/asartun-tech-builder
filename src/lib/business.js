// Pure business-sum logic (no React), so it can be tested with plain Node: npm run test:business
// Inputs are strings from the form. Negative or non-numeric values count as 0.
const num = (x) => Math.max(0, parseFloat(x) || 0)

export function computeBusiness(v) {
  const raw = num(v.raw), proc = num(v.proc), pack = num(v.pack), price = num(v.price)
  const total = raw + proc + pack
  const profit = price - total
  // A real attempt needs a selling price AND at least one cost. Empty or all-zero sums earn nothing.
  const valid = price > 0 && total > 0
  return { total, profit, valid }
}

// Business plan: costs for ONE unit (a list), a one-off cost, a selling price and how many units are planned.
// Unit cost, total cost, revenue, profit and break-even (units needed to cover the one-off cost) are worked out here.
export function computePlan(v) {
  const unitCost = (v.materials || []).reduce((s, m) => s + num(m.cost), 0)
  const fixed = num(v.fixed), price = num(v.price), units = Math.floor(num(v.units))
  const total = fixed + unitCost * units
  const revenue = price * units
  const margin = price - unitCost
  const breakEven = margin > 0 ? Math.ceil(fixed / margin) : null   // null = price does not cover the unit cost
  return { unitCost, fixed, price, units, total, revenue, profit: revenue - total, breakEven, belowCost: price > 0 && margin <= 0,
    valid: price > 0 && unitCost > 0 && units > 0 }
}
