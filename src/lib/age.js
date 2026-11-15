// Mirrors the database rule (migration 011) only to show the right label. The DATABASE is what really blocks the lesson.
const CAP = { '5-7': 7, '8-10': 10, '11-13': 13, '14-17': 17 }
export const ageCap = (band) => CAP[band] ?? null
// Unknown age counts as "8-10" for normal lessons and as too young for HIGH-risk lessons.
export const ageBlocked = (minAge, risk, band) => {
  if (!minAge) return false
  const cap = ageCap(band)
  return (risk === 'high' ? cap ?? 0 : cap ?? 10) < minAge
}
