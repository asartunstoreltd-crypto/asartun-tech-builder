// Pure logic for the science simulation / prototype test (no React), tested with: npm run test:phase2
// A simulation = a starting value (base) + the effect of each chosen option. The numbers are MODEL values written by the
// lesson author, never real measurements, and the learner screen says so.
const r1 = (x) => Math.round(x * 10) / 10

export const comboId = (def, picks) => def.vars.map((v) => picks[v.key]).join('|')

export function runSim(def, picks) {
  let v = Number(def.base) || 0
  for (const vr of def.vars) {
    const o = vr.options.find((x) => x.id === picks[vr.key])
    if (!o) return null
    v += Number(o.effect) || 0
  }
  return r1(v)
}

// index of the best run (lowest or highest reading, as the lesson says); first one wins a tie
export function bestIndex(def, runs) {
  if (!runs.length) return -1
  let best = 0
  runs.forEach((r, i) => { if (def.better === 'high' ? r.value > runs[best].value : r.value < runs[best].value) best = i })
  return best
}

export function comboCount(def) { return def.vars.reduce((n, v) => n * Math.max(1, v.options.length), 1) }
