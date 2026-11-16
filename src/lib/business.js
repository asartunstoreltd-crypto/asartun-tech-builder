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
