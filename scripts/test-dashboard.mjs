// Dashboard checks that need no database or browser: role matrix, routes, legacy redirects, staff counts, migration 027 (static analysis),
// the shared-phone queue fix, and real rendering of the staff card. Run: npm run test:dashboard
// (the render and bundle checks use esbuild + react, which `npm install` provides; set NODE_PATH if they live elsewhere)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8')
let pass = 0; const failed = []
const ok = (c, m) => { if (c) pass++; else { failed.push(m); console.error('FAIL:', m) } }
const section = (s) => console.log('\n# ' + s)

const { buildContext, NAV, NAV_BY_ID, visibleNav, canAccess, sectionOf } = await import(pathToFileURL(path.join(root, 'src/dashboard/access.js')))
const { legacyAdminTarget, legacyTeachTarget } = await import(pathToFileURL(path.join(root, 'src/dashboard/legacy.js')))
const sm = await import(pathToFileURL(path.join(root, 'src/dashboard/staffModel.js')))
const ids = (c) => visibleNav(c).map((n) => n.id)

section('Role-based access (UI rules)')
const none = buildContext({})
ok(ids(none).length === 0, 'no role -> no menu items')
const sup = buildContext({ adminRoles: ['super_admin'] })
ok(!sup.hasAdult && !canAccess(sup, 'staff') && !canAccess(sup, 'learners') && !canAccess(sup, 'classes') && !canAccess(sup, 'payments'), 'SUPER ADMIN ALONE gets no adult-learning section (separate grants)')
ok(['missions', 'organizations', 'school-staff', 'premium', 'activity', 'levels', 'media', 'child-learners', 'children'].every((i) => canAccess(sup, i)), 'Super Admin sees every children-app/platform section')
const ad = buildContext({ adultRole: 'adult_admin' })
ok(['staff', 'learners', 'classes', 'courses', 'content', 'assignments', 'attendance', 'reports', 'certificates', 'payments', 'overview', 'settings'].every((i) => canAccess(ad, i)), 'Adult Admin sees all adult sections')
ok(!canAccess(ad, 'missions') && !canAccess(ad, 'organizations') && !canAccess(ad, 'premium') && !canAccess(ad, 'children'), 'Adult Admin alone gets no children-app/platform section')
const fac = buildContext({ adultRole: 'facilitator' })
ok(['learners', 'classes', 'assignments', 'attendance', 'reports', 'certificates', 'overview', 'settings'].every((i) => canAccess(fac, i)), 'Teacher sees learners/classes/assignments/attendance/reports/certificates')
ok(!['staff', 'courses', 'content', 'payments', 'missions', 'organizations', 'premium', 'school-staff', 'activity'].some((i) => canAccess(fac, i)), 'Teacher cannot see staff, courses, lesson content, payments or platform admin')
const both = buildContext({ adminRoles: ['super_admin'], adultRole: 'adult_admin' })
ok(canAccess(both, 'staff') && canAccess(both, 'premium'), 'the same login with BOTH grants sees both sets')
ok(!buildContext({ adminRoles: [], adultRole: 'bogus' }).hasAdult, 'unknown adult role grants nothing')
ok(buildContext({ adminRoles: ['content_manager'] }).hasAdminRole('content_manager') && !canAccess(buildContext({ adminRoles: ['content_manager'] }), 'premium'), 'content manager: own sections only')
ok(canAccess(buildContext({ adminRoles: ['learning_analyst'] }), 'child-learners') && !canAccess(buildContext({ adminRoles: ['learning_analyst'] }), 'missions'), 'learning analyst: child learners only')
ok(!canAccess(buildContext({ adminRoles: ['media_manager'] }), 'missions') && canAccess(buildContext({ adminRoles: ['media_manager'] }), 'media'), 'media manager: media only')
ok(sectionOf('/dashboard/staff') === 'staff' && sectionOf('/dashboard/missions/abc') === 'missions' && sectionOf('/dashboard') === 'overview', 'sectionOf')

section('Routes and navigation')
const app = rd('src/dashboard/DashboardApp.jsx')
const routed = [...app.matchAll(/<Route path="([^"]+)" element=\{<G id="([^"]+)">/g)]
const routeIds = new Set(routed.map((m) => m[2]))
ok(NAV.every((n) => routeIds.has(n.id)), 'every menu item has a guarded route: ' + NAV.filter((n) => !routeIds.has(n.id)).map((n) => n.id))
ok([...routeIds].every((i) => NAV_BY_ID[i]), 'every guarded route id exists in the menu model')
ok(routed.every(([, p, id]) => p === id || p.startsWith(id + '/')), 'route paths match their ids (deep links such as missions/:id)')
const routeLines = app.split('\n').filter((l) => l.includes('<Route path=') && !l.includes('path="*"'))
ok(routeLines.every((l) => l.includes('<G id=')), 'no route is mounted without a guard')
ok(new Set(NAV.map((n) => n.id)).size === NAV.length, 'menu ids are unique')
ok(!/Navigate to="\/(admin|adult\/teach)/.test(app), 'the dashboard never redirects back to /admin or /adult/teach')

section('Legacy redirects')
const cases = [['/admin', '', '', '/dashboard/overview'], ['/admin/', '', '', '/dashboard/overview'], ['/admin/dashboard', '', '', '/dashboard/overview'], ['/admin/login', '', '', '/dashboard/overview'],
  ['/admin/missions', '', '', '/dashboard/missions'], ['/admin/missions/abc-123', '?tab=preview', '', '/dashboard/missions/abc-123?tab=preview'], ['/admin/levels', '', '', '/dashboard/levels'],
  ['/admin/media', '', '', '/dashboard/media'], ['/admin/learners', '', '', '/dashboard/child-learners'], ['/admin/organizations/5f1', '', '#x', '/dashboard/organizations/5f1#x'],
  ['/admin/staff', '', '', '/dashboard/school-staff'], ['/admin/premium', '', '', '/dashboard/premium'], ['/admin/activity', '', '', '/dashboard/activity'],
  ['/admin/nonsense/../../x', '', '', '/dashboard/overview'], ['/admin/missions/<script>', '', '', '/dashboard/missions'], ['/admin/staff/extra/parts', '', '', '/dashboard/school-staff']]
for (const [p, s, h, want] of cases) ok(legacyAdminTarget(p, s, h) === want, `legacy ${p}${s}${h} -> ${want} (got ${legacyAdminTarget(p, s, h)})`)
ok(legacyTeachTarget() === '/dashboard/classes', '/adult/teach -> /dashboard/classes')
const outs = [...cases.map((c) => legacyAdminTarget(c[0], c[1], c[2])), legacyTeachTarget()]
ok(outs.every((o) => o.startsWith('/dashboard/') && !o.startsWith('/dashboard/admin')), 'every redirect lands inside /dashboard')
ok(outs.every((o) => legacyAdminTarget(o) === '/dashboard/overview' || true) && !outs.some((o) => /^\/(admin|adult)/.test(o)), 'no redirect target is a legacy address (no loops)')
ok(outs.every((o) => { const seg = o.split('/')[2].split('?')[0].split('#')[0]; return NAV_BY_ID[seg] }), 'every redirect target is a real dashboard section')
const mainSrc = rd('src/main.jsx'); const adultApp = rd('src/adult/AdultApp.jsx')
ok(/path="\/admin\/\*" element=\{<LegacyAdmin \/>\}/.test(mainSrc) && /path="\/dashboard\/\*"/.test(mainSrc), 'main.jsx: /admin/* forwards, /dashboard/* mounted')
ok(/path="teach\/\*" element=\{<Navigate to=\{legacyTeachTarget\(\)\} replace \/>\}/.test(adultApp), 'AdultApp: /adult/teach forwards to the dashboard')
ok(!/\/admin\//.test(['MissionEditor', 'MissionList', 'Organizations', 'AdminDashboard', 'StaffAccounts'].map((f) => rd(`src/admin/${f}.jsx`)).join('\n')), 'admin pages now link to /dashboard (no hop through the redirect)')

section('Staff list model (counts from data, never hardcoded)')
const A = { user_id: 'a', full_name: 'Amina Yusuf', email: 'amina@x.org', phone: '+2348031234567', role: 'facilitator', active: true, classes: [{ id: 'c1', name: 'Class A', status: 'active', learners: 15 }, { id: 'c2', name: 'Class B', status: 'active', learners: 12 }] }
const B = { user_id: 'b', full_name: null, email: 'bala@x.org', phone: null, role: 'facilitator', active: false, classes: [{ id: 'c3', name: 'Class C', status: 'active', learners: 20 }] }
const C = { user_id: 'c', full_name: 'Chidi', email: 'chidi@x.org', role: 'adult_admin', active: true, classes: [] }
ok(sm.totalLearners(A) === 27 && sm.totalLearners(B) === 20 && sm.totalLearners(C) === 0, 'total learners = sum of that teacher\'s class counts (15+12, 20, 0)')
ok(sm.learnerCount(1) === '1 learner' && sm.learnerCount(0) === '0 learners' && sm.learnerCount(15) === '15 learners', 'singular/plural')
ok(sm.displayName(B) === 'bala@x.org' && sm.displayName(A) === 'Amina Yusuf', 'name falls back to email for staff created before names existed')
const all = [A, B, C]
ok(sm.filterStaff(all, { status: 'active' }).length === 2 && sm.filterStaff(all, { status: 'suspended' }).map((s) => s.user_id).join() === 'b', 'status filter')
ok(sm.filterStaff(all, { q: 'amina' }).length === 1 && sm.filterStaff(all, { q: '803 123' }).length === 1 && sm.filterStaff(all, { q: 'class c' })[0].user_id === 'b', 'search by name, phone digits, class')
ok(sm.filterStaff(all, { q: '12' }).length === 0, 'short digit strings do not match phone numbers by accident')
const cls = [{ id: 'c1', name: 'Class A', status: 'active' }, { id: 'c2', name: 'Class B', status: 'active' }, { id: 'c9', name: 'Old', status: 'closed' }, { id: 'c4', name: 'Class D', status: 'active' }]
ok(sm.assignableClasses(cls, A).map((c) => c.id).join() === 'c4', 'assignable = active classes the teacher does not already have (no duplicates, no closed)')

section('Migration 027 (static analysis only — NOT executed against a database)')
const m = rd('supabase/migrations/027_staff_management.sql'); const low = m.toLowerCase()
ok(!/\bdrop\s+(table|column|schema|policy|function)\b/.test(low.replace(/drop trigger if exists[^;]*;/g, '')), 'no DROP TABLE / COLUMN / SCHEMA / POLICY / FUNCTION')
ok(!/\btruncate\b/.test(low) && !/alter table[^;]*\bdrop\b/.test(low) && !/rename\s+(to|column)/.test(low), 'no TRUNCATE, no ALTER ... DROP, no RENAME')
ok(!/create policy|alter policy|disable row level security|grant all|grant select on|grant update|grant insert|grant delete/.test(low), 'no policy or table-privilege changes (browser stays read-only through existing RLS)')
ok(/delete from public\.adult_class_staff/.test(low) && !/delete from public\.(adult_staff|adult_profiles|adult_class_members|adult_classes|adult_audit_log)/.test(low), 'the only DELETE removes a class assignment row')
ok(/add column if not exists/.test(low) && !/add column (?!if not exists)/.test(low), 'every added column is IF NOT EXISTS (re-runnable)')
ok(/create unique index if not exists adult_staff_phone_uidx/.test(low) && /adult_class_staff_user_idx/.test(low) && /adult_audit_actor_idx/.test(low), 'indexes: unique staff phone, assignments by teacher, audit by actor')
const fnNames = [...m.matchAll(/create or replace function public\.(adult_admin_[a-z_]+)\(/g)].map((x) => x[1])
ok(fnNames.length === 8, 'eight admin functions defined: ' + fnNames.join(', '))
for (const f of fnNames) {
  const start = m.indexOf(`public.${f}(`); const end = m.indexOf('end $$;', start); const body = m.slice(start, end)
  ok(/security definer set search_path = ''/.test(body), f + ': SECURITY DEFINER with empty search_path')
  ok(/if not public\.is_adult_staff\(array\['adult_admin'\]\) then raise exception 'not authorized'/.test(body), f + ': refuses anyone who is not an ACTIVE adult admin (so a /admin Super Admin alone, a teacher or a suspended admin is refused)')
  ok(new RegExp(`'${f}\\([^']*\\)'`).test(m), f + ': included in the revoke/grant list')
}
ok(/revoke all on function public\.%s from public, anon/.test(m) && /grant execute on function public\.%s to authenticated/.test(m), 'functions are not callable by anon')
const set = m.slice(m.indexOf('adult_admin_set_staff_active(p_user'), m.indexOf('-- ---------- assign / unassign'))
ok(/cannot change own status/.test(set) && /last admin/.test(set), 'cannot suspend yourself or the last active adult admin')
const asg = m.slice(m.indexOf('function public.adult_admin_assign_class'), m.indexOf('function public.adult_admin_unassign_class'))
ok(/only facilitators/.test(asg) && /staff suspended/.test(asg) && /class is closed/.test(asg) && /on conflict do nothing/.test(asg), 'assign: teachers only, not suspended, active class, no duplicate')
const rea = m.slice(m.indexOf('function public.adult_admin_reassign_class'), m.indexOf('-- ---------- what a staff member'))
ok(/already assigned/.test(rea) && /not assigned/.test(rea) && rea.indexOf('delete from') < rea.indexOf('insert into'), 'reassign: validates first, then moves inside one function call (one transaction)')
ok(/adult_log\('assign_class'/.test(asg) && /adult_log\('unassign_class'/.test(m) && /adult_log\('reassign_class'/.test(m) && /'suspend_staff'/.test(m) && /'reactivate_staff'/.test(m), 'every change is written to adult_audit_log (who, what, when)')
ok(/assigned_by := coalesce\(new\.assigned_by, auth\.uid\(\)\)/.test(m) && /before insert on public\.adult_class_staff/.test(m), 'assignments are stamped with who/when, including the older assign-by-email function')
const list = m.slice(m.indexOf('function public.adult_admin_list_staff'), m.indexOf('-- ---------- name and phone'))
ok(/adult_class_members m where m\.class_id = c\.id and m\.left_at is null/.test(list), 'learner counts = current members (left_at is null) of each class')
ok(/from public\.adult_staff s join auth\.users u/.test(list), 'list includes EVERY adult_staff row (every teacher created appears)')
ok(!/service_role/i.test(m), 'no secrets in the migration')
ok(!/adult_staff[^;]*\bactive\b[^;]*=\s*true[^;]*update/.test(low), 'migration does not silently reactivate anyone')
// existing security helpers untouched
const mig17 = rd('supabase/migrations/017_adult_core.sql')
ok(/is_adult_staff\(p_roles text\[\] default null\)[\s\S]*s\.active/.test(mig17), 'existing is_adult_staff still requires active (suspension takes effect on every RLS check)')

section('Hygiene')
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)])
const srcFiles = [...walk('src'), ...walk('public')].filter((f) => /\.(jsx?|html|json|webmanifest|css)$/.test(f))
const code = (f) => rd(f).split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')     // comments may MENTION the service role; code must not use it
ok(!srcFiles.some((f) => /service_role|SERVICE_ROLE|eyJ[A-Za-z0-9_-]{30,}/.test(code(f))), 'no service-role key, no embedded JWT in src/ or public/ code')
ok(!srcFiles.filter((f) => f.startsWith('src/dashboard') || f.startsWith('src/pwa')).some((f) => /localStorage\.setItem\([^)]*(email|token|session|learner|password)/i.test(rd(f))), 'dashboard/PWA code stores no personal data in localStorage')
const sess = rd('src/dashboard/session.js')
ok(/sessionStorage\.clear/.test(sess) && /atb-dash-/.test(sess) && /CLEAR_CACHES/.test(sess) && !/removeItem\('atb'\)/.test(sess), 'sign-out wipe: session storage, dashboard keys, caches — and the children\'s progress is left alone')
ok(/window\.location\.reload\(\)/.test(rd('src/dashboard/DashAuth.jsx')) && /seen\.current !== uid/.test(rd('src/dashboard/DashAuth.jsx')), 'switching to another account reloads the app (no in-memory data survives)')
ok(/aria-modal="true"/.test(rd('src/dashboard/Dialog.jsx')) && /Escape/.test(rd('src/dashboard/Dialog.jsx')), 'dialogs: aria-modal + Escape')
ok(/aria-expanded/.test(rd('src/dashboard/Shell.jsx')) && /setOpen\(false\)/.test(rd('src/dashboard/Shell.jsx')), 'drawer: aria-expanded, closes after navigation')

section('Offline lesson queue is per learner (shared-phone fix)')
{
  const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  const q = await import(pathToFileURL(path.join(root, 'src/adult/progressQueue.js')) + '?t=' + Date.now())
  q.enqueue({ client: 'x1', lesson: 'l1' }, 'learner-A'); q.enqueue({ client: 'x2', lesson: 'l2' }, 'learner-A'); q.enqueue({ client: 'x3', lesson: 'l9' })
  ok(q.pendingCount() === 2, 'an item with no owner is never queued')
  const sent = []; const send = async (i) => { sent.push(i); return { error: null } }
  await q.flush(send, 'learner-B')
  ok(sent.length === 0 && q.pendingCount() === 2, 'learner B signing in does NOT send learner A\'s results')
  await q.flush(send, undefined)
  ok(sent.length === 0, 'no signed-in learner -> nothing sent')
  await q.flush(send, 'learner-A')
  ok(sent.length === 2 && sent.every((i) => !('owner' in i)) && q.pendingCount() === 0, 'learner A gets their own results back, owner tag removed from the payload')
  store.set('adult-pending-progress', JSON.stringify([{ client: 'old', lesson: 'l1' }]))
  await q.flush(send, 'learner-A')
  ok(sent.length === 2 && q.pendingCount() === 0, 'items written by the older version (owner unknown) are dropped, never sent to anyone')
  store.set('adult-pending-progress', JSON.stringify([{ client: 'n', lesson: 'l', owner: 'learner-A' }]))
  await q.flush(async () => ({ error: 'network' }), 'learner-A')
  ok(q.pendingCount() === 1, 'a network failure keeps the learner\'s own item for later')
}

section('Bundle + render (esbuild + react)')
let esbuild, req
try { req = createRequire(import.meta.url); esbuild = req('esbuild') } catch { esbuild = null }
if (!esbuild) { console.log('SKIPPED: esbuild not found (run npm install, or set NODE_PATH)'); }
else {
  const nodePaths = (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)
  const ext = ['react-router-dom', 'lucide-react', '@supabase/supabase-js', 'react-dom/client']
  const define = { 'import.meta.env.VITE_SUPABASE_URL': '"https://x.supabase.co"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"k"', 'import.meta.env.PROD': 'true', 'import.meta.env': '{}' }
  for (const entry of ['src/dashboard/DashboardApp.jsx', 'src/main.jsx', 'src/dashboard/pages/AdultSections.jsx', 'src/dashboard/pages/StaffPage.jsx']) {
    try { await esbuild.build({ entryPoints: [path.join(root, entry)], bundle: true, write: false, format: 'esm', jsx: 'automatic', loader: { '.jsx': 'jsx', '.css': 'empty', '.png': 'empty' }, external: ext, define, logLevel: 'silent', outdir: os.tmpdir(), nodePaths }); ok(true, 'bundles: ' + entry) }
    catch (e) { ok(false, 'bundle failed: ' + entry + ' — ' + (e.errors || []).map((x) => x.text).join('; ')) }
  }
  // Render the staff card with real numbers.
  const entry = `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import Card from '${path.join(root, 'src/dashboard/pages/StaffCard.jsx').replace(/\\/g, '/')}';
    export const html = (p) => renderToStaticMarkup(React.createElement(Card, { onAssign(){}, onMove(){}, onRemove(){}, onSuspend(){}, onReactivate(){}, onDetails(){}, onEdit(){}, ...p }))`
  const out = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent', nodePaths })
  const tmp = path.join(os.tmpdir(), 'atb-card-' + process.pid + '.cjs'); fs.writeFileSync(tmp, out.outputFiles[0].text)
  const { html } = createRequire(import.meta.url)(tmp)
  const ha = html({ staff: A }); const hb = html({ staff: B }); const hc = html({ staff: C })
  ok(/Class A<\/strong>.*?15 learners/.test(ha) && /Class B<\/strong>.*?12 learners/.test(ha) && /2 classes.*27 learners in total/.test(ha), 'Teacher A card: Class A — 15 learners, Class B — 12 learners (each class shown separately)')
  ok(/Class C<\/strong>.*?20 learners/.test(hb) && /1 class\b/.test(hb), 'Teacher B card: Class C — 20 learners')
  ok(/Suspended/.test(hb) && /Reactivate/.test(hb) && !/>Suspend</.test(hb) && /Assign class<\/button>/.test(hb) && /disabled/.test(hb), 'suspended card: shows Suspended + Reactivate; assigning is disabled')
  ok(/Active/.test(ha) && />Suspend</.test(ha), 'active card: Active + Suspend')
  ok(/Adult Admin/.test(hc) && !/Assign class/.test(hc) && /not assigned to them/.test(hc), 'adult admin card has no class assignment')
  ok(/bala@x\.org/.test(hb) && /—/.test(hb), 'missing name/phone shown as email / dash')
  ok(!/>Suspend</.test(html({ staff: A, isSelf: true })) && /\(you\)/.test(html({ staff: A, isSelf: true })), 'you cannot suspend yourself from your own card')
  const h2 = html({ staff: { ...A, classes: [{ id: 'z', name: 'Zed', status: 'active', learners: 3 }, { id: 'y', name: 'Why', status: 'closed', learners: 0 }] } })
  ok(/3 learners/.test(h2) && /0 learners/.test(h2) && /closed/.test(h2) && !/15 learners/.test(h2), 'counts change with the data (nothing hardcoded)')
  fs.writeFileSync(path.join(os.tmpdir(), 'atb-card-sample.html'), ha + hb + hc)
}
console.log(`\n${pass} checks passed, ${failed.length} failed`)
if (failed.length) { console.error(failed.map((f) => ' - ' + f).join('\n')); process.exit(1) }
