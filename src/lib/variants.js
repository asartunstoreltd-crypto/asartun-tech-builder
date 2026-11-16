// One topic can have a lesson for each level (same `family`). Show each child only the best one for their age:
// the version with the highest minimum age that the child may open. If none is open yet, show the youngest (locked).
// If two open versions have the same minimum age, the NEWER one wins (so a reviewed replacement takes over automatically).
// Missions without a family are never touched. The DATABASE still decides what can really be opened.
import { ageBlocked } from './age.js'

export function pickVariants(list, band) {
  const byFamily = {}
  list.forEach((m) => { if (m.family) (byFamily[m.family] = byFamily[m.family] || []).push(m) })
  const keep = new Set()
  Object.values(byFamily).forEach((vs) => {
    const open = vs.filter((m) => !ageBlocked(m.minAge, m.risk, band))
    const pool = open.length ? open : vs
    const best = [...pool].sort((a, b) => (open.length ? (b.minAge || 0) - (a.minAge || 0) : (a.minAge || 0) - (b.minAge || 0)) || (open.length ? b.no - a.no : a.no - b.no))[0]
    keep.add(best.id)
  })
  return list.filter((m) => !m.family || keep.has(m.id))
}
