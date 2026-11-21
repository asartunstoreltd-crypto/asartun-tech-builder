// PWA checks: manifest, icons, index.html, headers config, and the service worker's behaviour (run in a sandbox with fake fetch/caches).
// NOT covered here (needs a real browser): the install prompt, Lighthouse "installable", and real offline behaviour. Run: npm run test:pwa
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8')
let pass = 0; const failed = []
const ok = (c, m) => { if (c) pass++; else { failed.push(m); console.error('FAIL:', m) } }
const section = (s) => console.log('\n# ' + s)

section('Manifest')
const mf = JSON.parse(rd('public/manifest.webmanifest'))
ok(mf.name === 'ASARTUN TECH BUILDER' && mf.short_name === 'ASARTUN' && mf.short_name.length <= 12, 'name and short_name')
ok(mf.display === 'standalone' && mf.start_url === '/' && mf.scope === '/' && mf.id === '/', 'standalone, start_url, scope, id')
ok(/^#[0-9a-f]{6}$/i.test(mf.theme_color) && /^#[0-9a-f]{6}$/i.test(mf.background_color) && mf.theme_color.toLowerCase() === '#0b5ed7', 'theme colour is the ASARTUN blue')
const png = (f) => { const b = fs.readFileSync(path.join(root, 'public', f.replace(/^\//, ''))); return { sig: b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
for (const i of mf.icons) { const p = png(i.src); const [w, h] = i.sizes.split('x').map(Number); ok(p.sig && p.w === w && p.h === h, `icon ${i.src} is a real ${i.sizes} PNG`) }
ok(mf.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any') && mf.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any') && mf.icons.some((i) => i.purpose === 'maskable'), '192, 512 and maskable icons present')
ok((mf.shortcuts || []).every((s) => s.url.startsWith('/')), 'shortcuts stay inside the scope')
for (const f of ['apple-touch-icon.png', 'favicon-32.png']) ok(png('icons/' + f).sig, f + ' exists')

section('index.html')
const html = rd('index.html')
ok(/<link rel="manifest" href="\/manifest\.webmanifest"/.test(html) && /name="theme-color" content="#0b5ed7"/.test(html) && /rel="apple-touch-icon"/.test(html) && /name="viewport"/.test(html), 'manifest link, theme-color, apple-touch-icon, viewport')
const off = rd('public/offline.html')
ok(!/<script/i.test(off) && /href="\/"/.test(off) && /You are offline/.test(off), 'offline page: static, no script, link back')

section('Headers (Vercel + Netlify)')
const v = JSON.parse(rd('vercel.json')); const src = v.headers.map((h) => h.source)
ok(['/dashboard', '/dashboard/(.*)', '/sw.js', '/manifest.webmanifest', '/adult'].every((s) => src.includes(s)), 'vercel.json: dashboard, sw.js and manifest rules present, adult rules kept')
const val = (s, k) => (v.headers.find((h) => h.source === s).headers.find((x) => x.key === k) || {}).value
ok(/default-src 'self'/.test(val('/dashboard', 'Content-Security-Policy')) && /frame-ancestors 'none'/.test(val('/dashboard/(.*)', 'Content-Security-Policy')), 'dashboard has the same strict CSP as the adult app')
ok(/no-cache/.test(val('/sw.js', 'Cache-Control')) && /no-store/.test(val('/sw.js', 'Cache-Control')), 'sw.js is never cached by the browser/CDN (updates are found)')
const nh = rd('public/_headers')
ok(/\/dashboard\n  Content-Security-Policy/.test(nh) && /\/dashboard\/\*\n  Content-Security-Policy/.test(nh) && /\/sw\.js\n  Cache-Control: no-cache/.test(nh) && /\/adult\n/.test(nh), '_headers: same rules for Netlify')
ok(JSON.stringify(v.rewrites || v.routes || []).includes('index.html'), 'SPA rewrite still present (real files such as /sw.js are served first)')

section('Registration code')
const reg = rd('src/pwa/register.js')
ok(/import\.meta\.env\.PROD/.test(reg) && /register\('\/sw\.js'/.test(reg), 'registers only in production builds')
ok(/accepted/.test(reg) && /controllerchange/.test(reg) && /SKIP_WAITING/.test(reg), 'updates apply only after the person taps Update, then reload once')
ok(/Update/.test(rd('src/pwa/UpdatePrompt.jsx')) && /aria-live/.test(rd('src/pwa/UpdatePrompt.jsx')), 'update banner is announced to screen readers')

section('Service worker behaviour (sandboxed)')
const code = rd('public/sw.js')
function boot() {
  const handlers = {}; const stores = new Map(); let skipped = false; let fetchCalls = []; let net = async () => ({ status: 200, type: 'basic', clone() { return this }, body: 'net' })
  const mkCache = (n) => { if (!stores.has(n)) stores.set(n, new Map()); const m = stores.get(n); return { match: async (r) => m.get(typeof r === 'string' ? r : new URL(r.url).pathname), put: async (r, res) => { m.set(new URL(r.url).pathname, res) }, addAll: async (urls) => { urls.forEach((u) => m.set(u, { status: 200, type: 'basic', body: 'pre:' + u, clone() { return this } })) } } }
  const caches = { open: async (n) => mkCache(n), keys: async () => [...stores.keys()], delete: async (n) => stores.delete(n),
    match: async (r) => { for (const m of stores.values()) { const h = m.get(typeof r === 'string' ? r : new URL(r.url).pathname); if (h) return h } } }
  const self = { location: { origin: 'https://app.test' }, addEventListener: (t, f) => { handlers[t] = f }, clients: { claim: async () => {} }, skipWaiting: () => { skipped = true } }
  vm.runInNewContext(code, { self, caches, fetch: (r) => { fetchCalls.push(r.url); return net(r) }, URL, Response, console, Promise })
  const req = (url, o = {}) => ({ url, method: 'GET', mode: 'no-cors', ...o, headers: new Headers(o.headers || {}) })
  const fire = async (request) => { let p = null; await handlers.fetch({ request, respondWith: (x) => { p = x } }); return p ? await p : undefined }
  return { handlers, stores, caches, req, fire, get skipped() { return skipped }, get calls() { return fetchCalls }, setNet: (f) => { net = f }, run: async (t, e) => { let w; await handlers[t]({ ...e, waitUntil: (x) => { w = x } }); return w } }
}
{
  const s = boot()
  await s.run('install', {})
  ok(s.stores.has('atb-static-v1') && s.stores.get('atb-static-v1').has('/offline.html'), 'install pre-caches the offline page and icons only')
  ok(!s.skipped, 'install does not skip waiting: updates wait for the person')
  const intercepted = async (r) => (await s.fire(r)) !== undefined
  ok(!(await intercepted(s.req('https://abc.supabase.co/rest/v1/adult_profiles?select=*'))), 'cross-origin (Supabase) GET is not touched: learner records are never cached')
  ok(!(await intercepted(s.req('https://abc.supabase.co/storage/v1/object/sign/adult-submissions/x.png'))), 'signed file URLs are not touched')
  ok(!(await intercepted(s.req('https://app.test/assets/app-1a2b.js', { method: 'POST' }))), 'non-GET is not touched')
  ok(!(await intercepted(s.req('https://app.test/assets/app-1a2b.js', { headers: { authorization: 'Bearer x' } }))), 'requests with Authorization are not touched')
  ok(!(await intercepted(s.req('https://app.test/api/anything'))) && !(await intercepted(s.req('https://app.test/data.json'))), 'other same-origin GETs (not static assets) are not touched')
  ok(!(await intercepted(s.req('https://app.test/assets/video-9.mp4'))), 'media files are not cached')
  const before = JSON.stringify([...s.stores.get('atb-static-v1').keys()])
  const nav = await s.fire(s.req('https://app.test/dashboard/staff', { mode: 'navigate' }))
  ok(nav && nav.body === 'net' && JSON.stringify([...s.stores.get('atb-static-v1').keys()]) === before, 'page navigations go to the network and are NOT stored (no page is served to another user)')
  s.setNet(async () => { throw new TypeError('offline') })
  const offNav = await s.fire(s.req('https://app.test/dashboard/staff', { mode: 'navigate' }))
  ok(offNav && offNav.body === 'pre:/offline.html', 'offline navigation shows the offline page')
  s.setNet(async () => ({ status: 200, type: 'basic', clone() { return this }, body: 'js' }))
  s.calls.length = 0
  const a1 = await s.fire(s.req('https://app.test/assets/index-abc123.js')); const a2 = await s.fire(s.req('https://app.test/assets/index-abc123.js'))
  ok(a1.body === 'js' && a2.body === 'js' && s.calls.length === 1, 'built asset: fetched once, then served from cache')
  s.setNet(async () => ({ status: 206, type: 'basic', clone() { return this }, body: 'part' }))
  await s.fire(s.req('https://app.test/assets/partial.css')); ok(!s.stores.get('atb-static-v1').has('/assets/partial.css'), 'partial (206) responses are not cached')
  s.setNet(async () => ({ status: 200, type: 'opaque', clone() { return this }, body: 'x' }))
  await s.fire(s.req('https://app.test/assets/odd.css')); ok(!s.stores.get('atb-static-v1').has('/assets/odd.css'), 'opaque responses are not cached')
  // activate / messages
  s.stores.set('atb-static-v0', new Map()); s.stores.set('someone-elses', new Map())
  await s.run('activate', {})
  ok(!s.stores.has('atb-static-v0') && s.stores.has('someone-elses') && s.stores.has('atb-static-v1'), 'activate removes only our old caches')
  await s.run('message', { data: { type: 'SKIP_WAITING' } }); ok(s.skipped, 'SKIP_WAITING message activates the new version')
  await s.run('message', { data: { type: 'CLEAR_CACHES' } }); ok(s.stores.size === 0, 'CLEAR_CACHES (sent at sign-out) empties every cache')
}
ok(!/localStorage|indexedDB|supabase|authorization.*put/i.test(code.replace(/\/\*[\s\S]*?\*\//, '').replace(/^.*Authorization.*$/gim, '')), 'sw.js has no storage or Supabase code')

console.log(`\n${pass} checks passed, ${failed.length} failed`)
if (failed.length) { console.error(failed.map((f) => ' - ' + f).join('\n')); process.exit(1) }
