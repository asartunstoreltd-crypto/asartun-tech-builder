// Supabase Edge Function: adult-purge   STATUS: written, NOT deployed or run.
// Deletes photos and handwriting of classes that were closed more than 2 months ago.
// Files must be removed through the storage API (deleting storage rows in SQL can leave the files behind), so this is a function.
// Call it on a schedule (for example once a day) with the header  x-purge-secret: <PURGE_SECRET>.
// Deploy with  supabase functions deploy adult-purge --no-verify-jwt  (the scheduler sends no user login; the secret header is the protection).
// A ready-made schedule is in supabase/schedule/adult_purge_schedule.sql (NOT part of the migrations: it needs your project address and secret).
// Secrets to set:  PURGE_SECRET (a long random string). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const safeEqual = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const secret = Deno.env.get('PURGE_SECRET') ?? ''
  const given = req.headers.get('x-purge-secret') ?? ''
  if (secret.length < 24 || !safeEqual(secret, given)) return json({ error: 'Not allowed' }, 401)
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: rows, error } = await admin.rpc('adult_expired_submissions')
    if (error) return json({ error: 'Could not list expired work' }, 500)
    const list = (rows ?? []) as { id: string; file_path: string | null }[]
    const paths = list.map((r) => r.file_path).filter((p): p is string => Boolean(p))
    let removedFiles = 0
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error: re } = await admin.storage.from('adult-submissions').remove(paths.slice(i, i + 100))
      if (re) return json({ error: 'Could not remove files; nothing was deleted from the database', removedFiles }, 500)   // never delete rows while files remain
      removedFiles += data?.length ?? 0
    }
    const ids = list.map((r) => r.id)
    let deletedRows = 0
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error: de } = await admin.rpc('adult_purge_delete', { p_ids: ids.slice(i, i + 100) })
      if (de) return json({ error: 'Files removed but rows could not be deleted', removedFiles }, 500)
      deletedRows += Number(data ?? 0)
    }
    // housekeeping: old sign-up / code / wrong-PIN attempt records (migration 025), and a trace in the audit log that the job ran
    const { error: ce } = await admin.rpc('adult_cleanup_attempts')
    await admin.from('adult_audit_log').insert({ actor_id: null, action: 'purge', details: { removedFiles, deletedRows, cleanup: ce ? 'failed' : 'ok' } })
    return json({ ok: true, removedFiles, deletedRows, cleanup: ce ? 'failed' : 'ok' })
  } catch (_e) {
    return json({ error: 'Something went wrong' }, 500)
  }
})
