import { supabaseAdmin as db } from '../lib/supabase.js'
import { staffApi } from '../adult/adultApi.js'

// Staff-management calls. Every one is a database function that re-checks "active adult admin" itself;
// this file only shapes requests and turns database messages into plain sentences.
const MESSAGES = [
  [/not authorized|42501|permission denied/i, 'You do not have permission to do that.'],
  [/cannot change own/i, 'You cannot suspend your own account.'],
  [/last admin/i, 'At least one active Adult Admin must remain.'],
  [/class is closed/i, 'That class is closed.'],
  [/already assigned/i, 'The teacher already has that class.'],
  [/not assigned/i, 'That class is not assigned to this teacher (it may have just changed). Refreshing.'],
  [/only facilitators/i, 'Classes can only be assigned to teachers / facilitators.'],
  [/staff suspended/i, 'Reactivate this account before assigning classes.'],
  [/phone already used/i, 'Another staff member already uses that phone number.'],
  [/bad phone/i, 'Enter a valid phone number, for example 0803 123 4567.'],
  [/bad name/i, 'Enter the name (1 to 80 characters).'],
  [/same class/i, 'Choose a different class.'],
  [/no such (staff|class)/i, 'That record no longer exists. Refreshing.'],
  [/fetch|network|failed to send/i, 'Network problem. Check your connection and try again.'],
]
export const friendly = (e) => { const m = (e && e.message) || String(e || ''); const hit = MESSAGES.find(([re]) => re.test(m)); return hit ? hit[1] : 'Something went wrong. Please try again.' }

async function rpc(fn, args) {
  if (!db) throw new Error('Supabase is not configured.')
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new Error(error.message || 'rpc failed')
  return data
}

export const listStaff = () => rpc('adult_admin_list_staff', {}).then((d) => d || [])
export const setStaffProfile = (user, name, phone) => rpc('adult_admin_set_staff_profile', { p_user: user, p_name: name, p_phone: phone || null })
export const setStaffActive = (user, active) => rpc('adult_admin_set_staff_active', { p_user: user, p_active: active })
export const assignClass = (user, cls) => rpc('adult_admin_assign_class', { p_user: user, p_class: cls })
export const unassignClass = (user, cls) => rpc('adult_admin_unassign_class', { p_user: user, p_class: cls })
export const reassignClass = (user, from, to) => rpc('adult_admin_reassign_class', { p_user: user, p_from: from, p_to: to })
export const staffActivity = (user) => rpc('adult_admin_staff_activity', { p_user: user, p_limit: 50 })
export const staffSubmissions = (user) => rpc('adult_admin_staff_submissions', { p_user: user, p_limit: 50 })
export const listClasses = async () => { const { data, error } = await staffApi.classes(); if (error) throw new Error('classes ' + error); return data || [] }

// Creating a login needs the service-role key, so it happens in the existing Edge Function "adult-admin" (action create_staff), never in the browser.
// The name and phone are then saved with a database function. The one-time password is returned to be shown once.
export async function createTeacher({ email, name, phone }) {
  if (!db) throw new Error('Supabase is not configured.')
  const { data, error } = await db.functions.invoke('adult-admin', { body: { action: 'create_staff', email: email.trim().toLowerCase(), role: 'facilitator' } })
  if (error) {
    if (error.name === 'FunctionsFetchError' || (error.context && error.context.status === 404)) throw new Error('The “adult-admin” service is not deployed or not reachable yet (see docs/STAFF_DASHBOARD.md).')
    let msg = 'Could not create the account.'
    try { const j = await error.context.json(); if (j && j.error) msg = j.error } catch { /* keep default */ }
    throw new Error(msg)
  }
  if (!data || data.error || !data.user_id) throw new Error((data && data.error) || 'Could not create the account.')
  let profileSaved = true
  try { await setStaffProfile(data.user_id, name, phone) } catch (e) { profileSaved = false }
  return { userId: data.user_id, email: data.email, password: data.password, profileSaved }
}
