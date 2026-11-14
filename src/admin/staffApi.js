import { supabaseAdmin as db } from '../lib/supabase.js'

// Creating a login needs the service_role key, so it happens in the Edge Function "staff-admin" (never in the browser).
async function invoke(body) {
  const { data, error } = await db.functions.invoke('staff-admin', { body })
  if (error) {
    const missing = error.name === 'FunctionsFetchError' || (error.context && error.context.status === 404)
    if (missing) throw new Error('The staff service is not set up yet. Deploy the “staff-admin” function once (see docs/STAFF_ACCOUNTS.md).')
    let msg = error.message
    try { const j = await error.context.json(); if (j && j.error) msg = j.error } catch { /* keep message */ }
    throw new Error(msg)
  }
  if (data && data.error) throw new Error(data.error)
  return data
}
export const createStaff = (org_id, email, role, password) => invoke({ action: 'create', org_id, email, role, password: password || undefined })
export const resetStaffPassword = (user_id) => invoke({ action: 'reset', user_id })
export const allStaff = async () => {
  const { data, error } = await db.rpc('admin_all_staff')
  if (error) throw new Error(error.message)
  return data
}
