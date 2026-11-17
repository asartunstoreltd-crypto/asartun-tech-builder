// Guided handwriting: stroke guides for the Hausa letters, text layout, and a geometric tracing check.
// Pure functions (no React, no canvas) so they are unit-tested: scripts/test-adult.mjs.
//
// What this is NOT: handwriting recognition. scoreTrace only measures whether the learner's line follows the guide
// (how much of the guide was covered, how much ink stayed near it). Writing without a guide is always checked by a person.
// Block capitals are taught first. Each glyph lives in a 100 x 100 box, y pointing down; the order of the points inside a
// stroke is the writing direction, and the order of the strokes is the stroke order.
const rad = (d) => (d * Math.PI) / 180
const arc = (cx, cy, rx, ry, a0, a1, n = 14) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + ((a1 - a0) * i) / n); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] })
const HOOK = [[6, 24], [10, 12], [20, 5]]                       // the little curl on Ɓ Ɗ Ƙ: its own stroke, so leaving it out is noticed
const bBowls = [
  [[20, 5], [55, 5], ...arc(55, 27.5, 25, 22.5, -90, 90, 10), [20, 50]],
  [[20, 50], [58, 50], ...arc(58, 72.5, 27, 22.5, -90, 90, 10), [20, 95]],
]
const dBowl = [[20, 5], [50, 5], ...arc(50, 50, 40, 45, -90, 90, 14), [20, 95]]
const kArms = [[[78, 5], [20, 52]], [[38, 36], [80, 95]]]

export const GLYPHS = {
  A: [[[10, 95], [50, 5], [90, 95]], [[28, 62], [72, 62]]],
  B: [[[20, 5], [20, 95]], ...bBowls],
  'Ɓ': [HOOK, [[20, 5], [20, 95]], ...bBowls],
  C: [arc(55, 50, 40, 45, -40, -320, 20)],
  D: [[[20, 5], [20, 95]], dBowl],
  'Ɗ': [HOOK, [[20, 5], [20, 95]], dBowl],
  E: [[[20, 5], [20, 95]], [[20, 5], [80, 5]], [[20, 50], [70, 50]], [[20, 95], [80, 95]]],
  F: [[[20, 5], [20, 95]], [[20, 5], [80, 5]], [[20, 50], [70, 50]]],
  G: [[...arc(55, 50, 40, 45, -35, -360, 22), [60, 50]]],
  H: [[[20, 5], [20, 95]], [[80, 5], [80, 95]], [[20, 50], [80, 50]]],
  I: [[[30, 5], [70, 5]], [[50, 5], [50, 95]], [[30, 95], [70, 95]]],
  J: [[[70, 5], [70, 70], ...arc(45, 70, 25, 25, 0, 160, 10)]],
  K: [[[20, 5], [20, 95]], ...kArms],
  'Ƙ': [HOOK, [[20, 5], [20, 95]], ...kArms],
  L: [[[20, 5], [20, 95], [80, 95]]],
  M: [[[10, 95], [10, 5], [50, 60], [90, 5], [90, 95]]],
  N: [[[15, 95], [15, 5], [85, 95], [85, 5]]],
  O: [arc(50, 50, 40, 45, -90, -450, 28)],
  R: [[[20, 5], [20, 95]], [[20, 5], [55, 5], ...arc(55, 27.5, 25, 22.5, -90, 90, 10), [20, 50]], [[45, 50], [85, 95]]],
  S: [[...arc(50, 27, 30, 22, -30, -270, 14), ...arc(50, 73, 32, 22, -90, 150, 14)]],
  T: [[[10, 5], [90, 5]], [[50, 5], [50, 95]]],
  U: [[[15, 5], [15, 60], ...arc(50, 60, 35, 35, 180, 0, 14), [85, 5]]],
  W: [[[5, 5], [28, 95], [50, 25], [72, 95], [95, 5]]],
  Y: [[[10, 5], [50, 50]], [[90, 5], [50, 50], [50, 95]]],
  'Ƴ': [[[2, 24], [7, 11], [26, 5]], [[26, 5], [50, 50]], [[90, 5], [50, 50], [50, 95]]],
  Z: [[[15, 5], [85, 5], [15, 95], [85, 95]]],
  '.': [arc(10, 90, 6, 6, 0, 360, 10)],
}
// Digits 0-9 (Phase 5), kept in their own table so the letter tables and letter tests stay exactly as they were.
// Plain, open shapes that are easy to follow with a finger. 0 is narrower than the letter O so the two stay distinct.
export const DIGIT_GLYPHS = {
  '0': [arc(50, 50, 32, 45, -90, -450, 28)],
  '1': [[[28, 28], [52, 5], [52, 95]]],
  '2': [[...arc(50, 28, 32, 23, 180, 400, 16), [15, 95], [85, 95]]],
  '3': [[...arc(48, 27, 30, 22, 200, 450, 14), ...arc(48, 72, 34, 23, -90, 150, 14)]],
  '4': [[[65, 5], [10, 68], [88, 68]], [[65, 5], [65, 95]]],
  '5': [[[25, 5], [20, 48], ...arc(46, 70, 34, 25, -125, 150, 14)], [[25, 5], [80, 5]]],
  '6': [[[72, 8], [38, 28], [20, 68], ...arc(50, 68, 30, 27, 180, 540, 24)]],
  '7': [[[15, 5], [85, 5], [40, 95]]],
  '8': [arc(50, 27, 27, 22, -90, -450, 20), arc(50, 72, 32, 23, -90, -450, 20)],
  '9': [arc(50, 32, 30, 27, 0, -360, 22), [[80, 32], [72, 70], [40, 95]]],
}
export const DIGITS = Object.keys(DIGIT_GLYPHS)
const GUIDED = { ...GLYPHS, ...DIGIT_GLYPHS }                  // everything that can be traced
const ADVANCE = { ' ': 60, '.': 30 }                           // everything else: 110 (100 wide + 10 gap)
const adv = (ch) => ADVANCE[ch] ?? 110
export const HAUSA_LETTERS = Object.keys(GLYPHS).filter((c) => c !== '.')
export const canGuide = (text) => [...String(text).toUpperCase()].every((c) => c === ' ' || c === '\n' || GUIDED[c])

// text -> strokes in the canvas's own 0..1 coordinates (so they can be drawn on a canvas of that shape).
// Use \n to start a new line (the lessons put one word per line for sentences). aspect = canvas width / height.
// Returns null when a character has no guide (the page then uses free writing instead).
const rows = (text) => String(text).toUpperCase().split('\n').map((l) => [...l.trim()]).filter((l) => l.length)
const rowWidth = (r) => r.reduce((s, c) => s + adv(c), 0) - 10
const rowsHeight = (n) => n * 100 + (n - 1) * 40
export function layoutText(text, aspect, pad = 0.1) {
  const lines = rows(text)
  if (!lines.length || !canGuide(text)) return null
  const widths = lines.map(rowWidth), maxW = Math.max(...widths), H = rowsHeight(lines.length)
  const s = Math.min((aspect * (1 - 2 * pad)) / maxW, (1 - 2 * pad) / H)
  const top = (1 - H * s) / 2
  const strokes = []
  let idx = 0
  lines.forEach((row, li) => {
    const left = (aspect - widths[li] * s) / 2, y0 = li * 140
    let x0 = 0
    row.forEach((c) => {
      for (const st of GUIDED[c] || []) strokes.push({ letter: idx, pts: st.map(([x, y]) => [(left + (x0 + x) * s) / aspect, top + (y0 + y) * s]) })
      x0 += adv(c); idx++
    })
  })
  return { strokes, glyphHeight: 100 * s, aspect }
}
// A canvas shape that gives the guide a usable size on a phone (wide for one word, taller for several lines).
export function suggestAspect(text) {
  const lines = rows(text); if (!lines.length) return 1.4
  const a = (Math.max(...lines.map(rowWidth)) / rowsHeight(lines.length)) * 1.25
  return Math.round(Math.min(3.2, Math.max(1.2, a)) * 100) / 100
}

// ---- tracing check ----
const toUnits = (pts, aspect) => pts.map(([x, y]) => [x * aspect, y])
function distToSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}
const distToLines = (p, lines) => { let d = Infinity; for (const l of lines) { if (l.length === 1) d = Math.min(d, Math.hypot(p[0] - l[0][0], p[1] - l[0][1])); for (let i = 1; i < l.length; i++) d = Math.min(d, distToSeg(p, l[i - 1], l[i])) } return d }
function resample(line, step) {
  const out = [line[0]]
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / step))
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
  }
  return out
}
export const PASS_COVERAGE = 0.85, PASS_PRECISION = 0.8, PASS_STROKE = 0.6
export const TRACE_OK = 0.68                       // PASS_COVERAGE x PASS_PRECISION; a failed trace is never scored above TRACE_CAP
const TRACE_CAP = 0.67

// guide = result of layoutText; learner = strokes from HandwritingCanvas ({tool, pts}). Pencil strokes only.
// Passing needs ALL of: most of the guide covered, ink that stayed near the guide, and every single stroke followed
// (so a missing crossbar or a missing hook on Ɓ Ɗ Ƙ Ƴ is noticed). Eraser lines are not subtracted from the ink.
export function scoreTrace(guide, learner, aspect = guide.aspect) {
  const pen = learner.filter((s) => s.tool === 'pen' && s.pts.length)
  if (!pen.length) return { coverage: 0, precision: 0, weakest: 0, score: 0, ok: false }
  const g = guide.strokes.map((s) => toUnits(s.pts, aspect))
  const l = pen.map((s) => toUnits(s.pts, aspect))
  const tol = Math.max(0.1 * guide.glyphHeight, 0.05)
  const perStroke = g.map((line) => { const smp = resample(line, tol / 2); return smp.filter((p) => distToLines(p, l) <= tol).length / smp.length })
  const gs = g.flatMap((line) => resample(line, tol / 2)), ls = l.flatMap((line) => resample(line, tol / 2))
  const coverage = gs.filter((p) => distToLines(p, l) <= tol).length / gs.length
  const precision = ls.filter((p) => distToLines(p, g) <= tol * 1.5).length / ls.length
  const weakest = Math.min(...perStroke)
  const ok = coverage >= PASS_COVERAGE && precision >= PASS_PRECISION && weakest >= PASS_STROKE
  const raw = Math.round(coverage * precision * 100) / 100
  return { coverage, precision, weakest, score: ok ? Math.max(raw, TRACE_OK) : Math.min(raw, TRACE_CAP), ok }
}
