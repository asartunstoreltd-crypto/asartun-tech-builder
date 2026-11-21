// Pure helpers for the Staff list (tested). No hardcoded numbers: everything is computed from what the database returned.
export const ROLE_LABEL = { facilitator: 'Teacher / Facilitator', adult_admin: 'Adult Admin' }
export const displayName = (s) => (s.full_name && s.full_name.trim()) || s.email || 'Unnamed staff'
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
export const learnerCount = (n) => plural(n, 'learner', 'learners')
export const totalLearners = (s) => (s.classes || []).reduce((sum, c) => sum + (c.learners || 0), 0)   // a learner in two of the teacher's classes counts in both
export const formatDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }

export function filterStaff(list, { q = '', status = 'all' } = {}) {
  const needle = q.trim().toLowerCase()
  const digits = needle.replace(/[^0-9]/g, '')
  return (list || []).filter((s) => {
    if (status === 'active' && !s.active) return false
    if (status === 'suspended' && s.active) return false
    if (!needle) return true
    return [s.full_name, s.email].some((v) => (v || '').toLowerCase().includes(needle))
      || (digits.length >= 3 && (s.phone || '').replace(/[^0-9]/g, '').includes(digits))
      || (s.classes || []).some((c) => c.name.toLowerCase().includes(needle))
  })
}
// Classes a teacher could still be given (active, not already theirs).
export const assignableClasses = (allClasses, s) => (allClasses || []).filter((c) => c.status === 'active' && !(s.classes || []).some((x) => x.id === c.id))
