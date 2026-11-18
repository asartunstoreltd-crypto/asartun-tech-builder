// Photo preparation and stroke packing for Phase 6. The pure parts are tested (scripts/test-adult.mjs); compressPhoto needs a
// browser (createImageBitmap + canvas) and has NOT been run on a real phone yet.
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_INPUT_BYTES = 15 * 1024 * 1024     // what a phone camera may hand us, before shrinking
export const MAX_OUTPUT_BYTES = 1572864              // the private bucket's own limit (1.5 MB)
export const TARGET_BYTES = 450 * 1024               // we aim well below it to save mobile data

// -> null when fine, otherwise a code the page translates.
export function validatePhoto(file) {
  if (!file || !file.type || !ALLOWED_TYPES.includes(file.type.toLowerCase())) return 'PHOTO_TYPE'      // e.g. HEIC, PDF, video
  if (!(file.size > 0)) return 'PHOTO_EMPTY'
  if (file.size > MAX_INPUT_BYTES) return 'PHOTO_BIG'
  return null
}
// Never enlarges. Keeps the shape.
export function fitSize(w, h, max) {
  if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}
export const photoSettings = (lowData) => (lowData ? { max: 960, quality: 0.6 } : { max: 1280, quality: 0.72 })
export const qualitySteps = (q) => [...new Set([q, q - 0.1, q - 0.2, 0.4].map((x) => Math.round(Math.max(0.4, x) * 100) / 100))].sort((a, b) => b - a)
export const photoPath = (uid, uuid) => `${uid}/${uuid}.jpg`
export const photoPathOk = (uid, path) => new RegExp('^' + uid + '/[0-9a-f-]{36}\\.(jpg|png|webp)$').test(path)

// Shrinks the photo and turns it into a JPEG. Throws 'PHOTO_DECODE' when the browser cannot open the file.
export async function compressPhoto(file, lowData = false) {
  const bad = validatePhoto(file); if (bad) throw new Error(bad)
  const { max, quality } = photoSettings(lowData)
  let bmp
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) }                // keeps phone photos upright
  catch { try { bmp = await createImageBitmap(file) } catch { throw new Error('PHOTO_DECODE') } }
  let scale = 1
  for (let round = 0; round < 4; round++) {
    const { width, height } = fitSize(bmp.width * scale, bmp.height * scale, max)
    const cv = document.createElement('canvas'); cv.width = width; cv.height = height
    const c = cv.getContext('2d'); if (!c) throw new Error('PHOTO_DECODE')
    c.fillStyle = '#fff'; c.fillRect(0, 0, width, height); c.drawImage(bmp, 0, 0, width, height)
    for (const q of qualitySteps(quality)) {
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', q))
      if (blob && blob.size <= TARGET_BYTES) { bmp.close?.(); return { blob, width, height, bytes: blob.size, mime: 'image/jpeg' } }
      if (blob && q === 0.4 && round === 3 && blob.size <= MAX_OUTPUT_BYTES) { bmp.close?.(); return { blob, width, height, bytes: blob.size, mime: 'image/jpeg' } }
    }
    scale *= 0.8                                                                                  // still too big: make the picture smaller
  }
  bmp.close?.()
  throw new Error('PHOTO_BIG')
}

// Pack strokes for saving: pencil (and highlighter, for teachers) only, nearly-identical points dropped, first/last kept.
export function simplifyStrokes(strokes, { keep = ['pen'], minDist = 0.003, maxPts = 1500 } = {}) {
  const out = []
  for (const st of strokes || []) {
    if (!keep.includes(st.tool) || !Array.isArray(st.pts) || !st.pts.length) continue
    const pts = []
    for (let i = 0; i < st.pts.length; i++) {
      const p = st.pts[i]
      if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue
      const last = pts[pts.length - 1]
      const isEnd = i === st.pts.length - 1
      if (!last || isEnd || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDist) pts.push([Math.round(p[0] * 10000) / 10000, Math.round(p[1] * 10000) / 10000])
    }
    if (!pts.length) continue
    let use = pts
    if (pts.length > maxPts) { const k = (pts.length - 1) / (maxPts - 1); use = Array.from({ length: maxPts }, (_, i) => pts[Math.round(i * k)]) }
    out.push({ tool: st.tool, w: st.w, pts: use })
  }
  return out
}
