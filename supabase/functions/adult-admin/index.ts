// Supabase Edge Function: adult-admin   (ASARTUN ADULT LEARNING)   STATUS: written, NOT yet deployed or run.
// Creates adult accounts. Creating a login needs the service_role key, which exists ONLY here
// (Supabase injects SUPABASE_SERVICE_ROLE_KEY automatically; never paste it into the app).
//
// Actions (POST JSON {action, ...}):
//   self_register  {full_name, phone, pin}            — no sign-in needed; rate limited
//   create_learner {full_name, phone, pin?, class_id?} — facilitator or adult admin (facilitator must give a class they manage)
//   reset_pin      {learner_id}                        — staff who may see that learner; returns a new PIN once
//   create_staff   {email, role, password?}            — adult admin only
//
// Learners sign in with phone + PIN. The phone number becomes an internal login name <digits>@<ADULT_LOGIN_DOMAIN>
// (never emailed) and the PIN is the password. Keep ADULT_LOGIN_DOMAIN identical to VITE_ADULT_LOGIN_DOMAIN in the app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const DOMAIN = Deno.env.get('ADULT_LOGIN_DOMAIN') ?? 'adult.asartun.invalid'

// ---- same rules as src/adult/phone.js (a test compares the two) ----
function normalizePhone(raw: string): string | null {
  let s = String(raw ?? '').replace(/[\s\-().]/g, '')
  if (/^\+[0-9]{10,15}$/.test(s)) return s
  if (/^00[0-9]{10,15}$/.test(s)) return '+' + s.slice(2)
  if (/^0[789][01][0-9]{8}$/.test(s)) return '+234' + s.slice(1)      // Nigerian mobile: 080…, 070…, 090…, 081…
  if (/^234[0-9]{10}$/.test(s)) return '+' + s
  return null
}
function pinProblem(pin: string): string | null {
  if (!/^[0-9]{6}$/.test(pin)) return 'The PIN must be 6 digits.'
  if (/^(\d)\1{5}$/.test(pin)) return 'Choose a PIN that is not all the same digit.'
  if ('01234567890123456789'.includes(pin) || '98765432109876543210'.includes(pin)) return 'Choose a PIN that is not a simple sequence.'
  if (['112233', '121212', '123123', '111222', '123321'].includes(pin)) return 'Choose a PIN that is harder to guess.'
  return null
}
const loginName = (phone: string) => phone.replace('+', '') + '@' + DOMAIN
const randomPin = (): string => {
  for (;;) {
    const b = new Uint32Array(1); crypto.getRandomValues(b)
    const pin = String(b[0] % 1000000).padStart(6, '0')
    if (!pinProblem(pin)) return pin
  }
}
const randomPassword = (len = 14) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const b = new Uint32Array(len); crypto.getRandomValues(b)
  return Array.from(b, (n) => chars[n % chars.length]).join('')
}
const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('')
const cleanName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')

    // Create login + profile together; never leave one without the other.
    const createLearner = async (fullName: string, phone: string, pin: string, createdBy: string | null, verified: boolean, classId: string | null) => {
      const { data: cu, error: ce } = await admin.auth.admin.createUser({ email: loginName(phone), password: pin, email_confirm: true })
      if (ce || !cu?.user) {
        if (ce && /already|registered|exists/i.test(ce.message)) return { error: 'ALREADY', status: 409 }
        return { error: 'COULD_NOT_CREATE', status: 400 }
      }
      const id = cu.user.id
      const { error: pe } = await admin.from('adult_profiles').insert({ id, full_name: fullName, phone, phone_verified: verified, created_by: createdBy })
      if (pe) { await admin.auth.admin.deleteUser(id); return { error: /duplicate|unique/i.test(pe.message) ? 'ALREADY' : 'COULD_NOT_CREATE', status: 409 } }
      if (classId) await admin.from('adult_class_members').insert({ class_id: classId, learner_id: id })
      await admin.from('adult_audit_log').insert({ actor_id: createdBy, action: createdBy ? 'create_learner' : 'self_register', learner_id: id, details: { class_id: classId } })
      return { id }
    }

    // ---------------- self registration (anyone) ----------------
    if (action === 'self_register') {
      const fullName = cleanName(body.full_name); const phone = normalizePhone(body.phone); const pin = String(body.pin ?? '')
      if (!fullName || fullName.length > 80) return json({ error: 'NAME' }, 400)
      if (!phone) return json({ error: 'PHONE' }, 400)
      if (pinProblem(pin)) return json({ error: 'PIN' }, 400)
      const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
      const h = await sha256('adult|' + ip)
      const hourAgo = new Date(Date.now() - 3600_000).toISOString(); const dayAgo = new Date(Date.now() - 86400_000).toISOString()
      const { count: perIp } = await admin.from('adult_register_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', h).gt('at', hourAgo)
      const { count: perDay } = await admin.from('adult_register_attempts').select('id', { count: 'exact', head: true }).gt('at', dayAgo)
      if ((perIp ?? 0) >= 5 || (perDay ?? 0) >= 300) return json({ error: 'BUSY' }, 429)
      await admin.from('adult_register_attempts').insert({ ip_hash: h })
      const r = await createLearner(fullName, phone, pin, null, false, null)
      if ('error' in r) return json({ error: r.error }, r.status)
      return json({ ok: true })
    }

    // ---------------- everything below needs a signed-in staff member ----------------
    const { data: who } = await userClient.auth.getUser()
    const caller = who?.user
    if (!caller) return json({ error: 'You are not signed in.' }, 401)
    const { data: staffRow } = await admin.from('adult_staff').select('role,active').eq('user_id', caller.id).maybeSingle()
    if (!staffRow || !staffRow.active) return json({ error: 'Not allowed.' }, 403)
    const isAdmin = staffRow.role === 'adult_admin'

    if (action === 'create_learner') {
      const fullName = cleanName(body.full_name); const phone = normalizePhone(body.phone)
      const classId = body.class_id ? String(body.class_id) : null
      if (classId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classId)) return json({ error: 'Not allowed.' }, 403)
      const pin = body.pin ? String(body.pin) : randomPin()
      if (!fullName || fullName.length > 80) return json({ error: 'NAME' }, 400)
      if (!phone) return json({ error: 'PHONE' }, 400)
      if (pinProblem(pin)) return json({ error: 'PIN' }, 400)
      if (!isAdmin && !classId) return json({ error: 'CLASS_REQUIRED' }, 400)    // otherwise the facilitator could never see the learner
      if (classId) {
        const { data: can } = await userClient.rpc('adult_can_manage_class', { p_class: classId })   // evaluated as the caller
        if (can !== true) return json({ error: 'Not allowed.' }, 403)
      }
      const r = await createLearner(fullName, phone, pin, caller.id, true, classId)
      if ('error' in r) return json({ error: r.error }, r.status)
      return json({ ok: true, learner_id: r.id, pin })        // shown once to the facilitator, never stored in readable form
    }

    if (action === 'reset_pin') {
      const learnerId = String(body.learner_id ?? '')
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(learnerId)) return json({ error: 'Not allowed.' }, 403)
      // SECURITY: the login system is shared with the children's app and with staff. staff_can_see_learner() is true for the adult admin
      // for ANY id, so the target must be checked to be an adult LEARNER here, or this could reset anyone's password.
      const { data: target } = await admin.from('adult_profiles').select('id').eq('id', learnerId).maybeSingle()
      if (!target) return json({ error: 'Not allowed.' }, 403)
      const { data: can } = await userClient.rpc('staff_can_see_learner', { p_learner: learnerId })
      if (can !== true) return json({ error: 'Not allowed.' }, 403)
      const pin = randomPin()
      const { error } = await admin.auth.admin.updateUserById(learnerId, { password: pin })
      if (error) return json({ error: 'COULD_NOT_RESET' }, 400)
      await admin.from('adult_pin_failures').delete().eq('user_id', learnerId)     // a new PIN also clears any wrong-PIN lock (table from migration 025)
      await admin.from('adult_audit_log').insert({ actor_id: caller.id, action: 'reset_pin', learner_id: learnerId, details: {} })
      return json({ ok: true, pin })
    }

    if (action === 'create_staff') {
      if (!isAdmin) return json({ error: 'Only the adult admin can add staff.' }, 403)
      const email = String(body.email ?? '').trim().toLowerCase(); const role = String(body.role ?? '')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400)
      if (!['facilitator', 'adult_admin'].includes(role)) return json({ error: 'Role must be facilitator or adult_admin.' }, 400)
      const password = body.password ? String(body.password) : randomPassword()
      if (password.length < 10) return json({ error: 'The password must have at least 10 characters.' }, 400)
      const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (ce || !cu?.user) return json({ error: /already|registered|exists/i.test(ce?.message ?? '') ? 'That email already has a login.' : 'Could not create the account.' }, 400)
      const { error: se } = await admin.from('adult_staff').insert({ user_id: cu.user.id, role, created_by: caller.id })
      if (se) { await admin.auth.admin.deleteUser(cu.user.id); return json({ error: 'Could not create the account.' }, 400) }
      await admin.from('adult_audit_log').insert({ actor_id: caller.id, action: 'create_staff', details: { role, target_user: cu.user.id } })
      return json({ ok: true, user_id: cu.user.id, email, password })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (_e) {
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})
