// Old addresses -> their place in /dashboard. Pure functions (tested). Output ALWAYS starts with /dashboard, and nothing under /dashboard
// is ever redirected back to /admin or /adult/teach, so a redirect loop is impossible.
const ADMIN = { '': 'overview', dashboard: 'overview', login: 'overview', missions: 'missions', levels: 'levels', media: 'media', learners: 'child-learners',
  organizations: 'organizations', staff: 'school-staff', premium: 'premium', activity: 'activity' }
const WITH_ID = new Set(['missions', 'organizations'])
const SAFE = /^[A-Za-z0-9_-]{1,64}$/

export function legacyAdminTarget(pathname = '/admin', search = '', hash = '') {
  const parts = String(pathname).replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  const first = parts[0] || ''
  const section = Object.prototype.hasOwnProperty.call(ADMIN, first) ? ADMIN[first] : 'overview'
  const id = WITH_ID.has(first) && parts[1] && SAFE.test(parts[1]) ? '/' + parts[1] : ''
  return '/dashboard/' + section + id + (search || '') + (hash || '')
}
// The old facilitator area had one page with tabs: its natural successor is the assigned-classes view.
export const legacyTeachTarget = () => '/dashboard/classes'
