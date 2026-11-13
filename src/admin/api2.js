import { supabaseAdmin as db } from '../lib/supabase.js'

// Learners, organizations, premium. Every rule is enforced by the database; these are thin calls.
const call = async (fn, args) => { const { data, error } = await db.rpc(fn, args); if (error) throw new Error(error.message); return data }
const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data }

export const liveStats = () => call('admin_live_stats')
export const adminLearners = (search, org) => call('admin_learners', { p_search: search || null, p_org: org || null, p_limit: 300, p_offset: 0 })
export const adminLearnerResults = (id) => call('admin_learner_results', { p_user: id })
export const adminInsights = () => call('admin_insights')

export const listOrgs = async () => must(await db.from('organizations').select('*').order('created_at', { ascending: false }))
export const getOrg = async (id) => must(await db.from('organizations').select('*').eq('id', id).single())
export const createOrg = async (o) => must(await db.from('organizations').insert(o).select('id').single()).id
export const updateOrg = async (id, patch) => must(await db.from('organizations').update(patch).eq('id', id))
export const deleteOrg = async (id) => must(await db.from('organizations').delete().eq('id', id))
export const regenCode = (id) => call('admin_regenerate_org_code', { p_org: id })
export const orgStaff = (id) => call('admin_org_staff', { p_org: id })
export const addStaff = (org, email, role) => call('admin_add_org_member', { p_org: org, p_email: email, p_role: role })
export const removeStaff = async (id) => must(await db.from('org_members').delete().eq('id', id))
export const listClasses = async (org) => must(await db.from('org_classes').select('*').eq('org_id', org).order('created_at'))
export const addClass = async (org, name) => must(await db.from('org_classes').insert({ org_id: org, name }))
export const deleteClass = async (id) => must(await db.from('org_classes').delete().eq('id', id))

export const staffOrgs = () => call('org_staff_orgs')
export const orgLearners = (org) => call('org_learners', { p_org: org })
export const orgLearnerResults = (org, user) => call('org_learner_results', { p_org: org, p_user: user })
export const orgReport = (org) => call('org_report', { p_org: org })
export const setStudentRef = (org, user, ref) => call('org_set_student_ref', { p_org: org, p_user: user, p_ref: ref })

export const entitlements = () => call('admin_entitlements')
export const grantPremium = (user, org, until, note) => call('admin_grant_premium', { p_user: user || null, p_org: org || null, p_until: until || null, p_note: note || null })
export const revokePremium = (id) => call('admin_revoke_premium', { p_id: id })
export const missionTitles = async () => Object.fromEntries(must(await db.from('missions').select('slug,title')).map((m) => [m.slug, m.title]))

export function downloadCsv(name, rows) {
  const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"'
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
export const ago = (t) => {
  if (!t) return 'never'
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return m + ' min ago'
  if (m < 1440) return Math.round(m / 60) + ' h ago'
  return Math.round(m / 1440) + ' days ago'
}
