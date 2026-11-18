// Supabase Edge Function: staff-admin
// Lets a SUPER ADMIN create / reset school & company staff accounts from the admin panel.
// Creating a login needs the service_role key, which must never be in the browser, so it lives ONLY here
// (Supabase injects SUPABASE_SERVICE_ROLE_KEY into Edge Functions automatically; you do not paste it anywhere).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const makePassword = (len = 14) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'   // no look-alike characters
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => chars[n % chars.length]).join('')
}

// Find an existing login by email (small user base: a few pages are enough).
async function findUserId(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data || !data.users || !data.users.length) return null
    const u = data.users.find((x: any) => (x.email ?? '').toLowerCase() === email)
    if (u) return u.id as string
    if (data.users.length < 1000) return null
  }
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1) Who is calling? (their own token, checked by Supabase)
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: who } = await userClient.auth.getUser()
    const caller = who && who.user
    if (!caller) return json({ error: 'You are not signed in.' }, 401)

    // 2) Only a Super Admin may continue
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: roles } = await admin.from('admin_roles').select('role').eq('user_id', caller.id)
    if (!roles || !roles.some((r: any) => r.role === 'super_admin')) return json({ error: 'Only a Super Admin can manage staff accounts.' }, 403)

    const body = await req.json().catch(() => ({}))
    const log = (action: string, entityId: string, details: Record<string, unknown>) =>
      admin.from('admin_activity_logs').insert({ actor_id: caller.id, action, entity: 'org_members', entity_id: entityId, details })

    // ---------------- create a staff account (or add an existing login) ----------------
    if (body.action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const role = String(body.role ?? '')
      const orgId = String(body.org_id ?? '')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400)
      if (!['teacher', 'org_admin'].includes(role)) return json({ error: 'Role must be teacher or org_admin.' }, 400)
      const { data: org } = await admin.from('organizations').select('id,name').eq('id', orgId).maybeSingle()
      if (!org) return json({ error: 'Organization not found.' }, 404)

      const password = body.password ? String(body.password) : makePassword()
      if (password.length < 10) return json({ error: 'The password must have at least 10 characters.' }, 400)

      let userId: string | null = null
      let created = false
      const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (cu && cu.user) { userId = cu.user.id; created = true }
      else if (ce && /already|registered|exists/i.test(ce.message)) userId = await findUserId(admin, email)
      else return json({ error: (ce && ce.message) || 'Could not create the account.' }, 400)
      if (!userId) return json({ error: 'That email already has a login but it could not be found.' }, 500)

      const { error: me } = await admin.from('org_members').upsert({ org_id: orgId, user_id: userId, role }, { onConflict: 'org_id,user_id' })
      if (me) {
        if (created) await admin.auth.admin.deleteUser(userId)      // never leave a login with no organization
        return json({ error: me.message }, 400)
      }
      await log(created ? 'create_staff' : 'add_staff', orgId, { role, target_user: userId })
      return json({ created, user_id: userId, email, org: org.name, password: created ? password : null })
    }

    // ---------------- reset the password of a staff account ----------------
    if (body.action === 'reset') {
      const uid = String(body.user_id ?? '')
      const { data: member } = await admin.from('org_members').select('org_id').eq('user_id', uid).limit(1)
      const { data: isAdmin } = await admin.from('admin_roles').select('role').eq('user_id', uid).limit(1)
      // never touch ASARTUN admins or accounts that are not school/company staff
      if (!member || !member.length || (isAdmin && isAdmin.length)) return json({ error: 'This account is not school/company staff.' }, 403)
      const password = body.password ? String(body.password) : makePassword()
      if (password.length < 10) return json({ error: 'The password must have at least 10 characters.' }, 400)
      const { data: up, error: ue } = await admin.auth.admin.updateUserById(uid, { password })
      if (ue || !up || !up.user) return json({ error: (ue && ue.message) || 'Could not reset the password.' }, 400)
      await log('reset_staff_password', member[0].org_id, { target_user: uid })
      return json({ user_id: uid, email: up.user.email, password })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    return json({ error: 'Something went wrong: ' + (e instanceof Error ? e.message : String(e)) }, 500)
  }
})
