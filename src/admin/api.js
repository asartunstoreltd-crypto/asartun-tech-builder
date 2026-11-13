import { supabaseAdmin as db } from '../lib/supabase.js'
import { ui } from '../data/translations'

// All admin database/storage calls live here. Authorization is enforced by the database (RLS), not by this file.
export const rid = () => Math.random().toString(36).slice(2, 8)
export const blank = () => ({ ha: '', en: '' })
export const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-')
const fail = (error) => { if (error) throw new Error(error.message || String(error)) }
export const stageLabel = { draft: 'Draft', under_review: 'Under review', published: 'Published', archived: 'Archived', coming_soon: 'Coming soon' }

// ---------- the 13 learning step types ----------
export const STEP_TYPES = [
  { type: 'story', emoji: '📖', name: 'Story', section: 'teach', help: 'A short story that starts the lesson.' },
  { type: 'intro', emoji: '👋', name: 'Introduction', section: 'teach', help: 'Welcome the child and say what they will learn.' },
  { type: 'teach', emoji: '📘', name: 'Explanation / Teach', section: 'teach', help: 'Explain one idea: what it is, what it does, why.' },
  { type: 'materials', emoji: '🧰', name: 'Materials and Components', section: 'teach', help: 'Introduce one material, tool or component.' },
  { type: 'demo', emoji: '🎬', name: 'Demonstration / Show', section: 'procs', help: 'Animated step-by-step demonstration. The child watches it first, then practises it.' },
  { type: 'practice', emoji: '🖐️', name: 'Interactive Practice', section: 'procs', help: 'Same steps as a demonstration: watched first, then the child puts them in order with hints.' },
  { type: 'dragdrop', emoji: '🧲', name: 'Drag and Drop Activity', section: 'chals', help: 'Match items to groups (2 to 4 groups). On phones the child taps the group.' },
  { type: 'ordering', emoji: '🔢', name: 'Ordering Activity', section: 'procs', help: 'The child puts the steps in the right order (after watching them).' },
  { type: 'simulation', emoji: '💰', name: 'Simulation', section: 'chals', help: 'Ready-made business calculator (cost, selling price, profit). Other simulations need a developer.' },
  { type: 'quiz', emoji: '❓', name: 'Quiz', section: 'quiz', help: 'One question with answers and an explanation.' },
  { type: 'challenge', emoji: '🏁', name: 'Challenge', section: 'chals', help: 'A sorting challenge to finish the lesson.' },
  { type: 'summary', emoji: '📝', name: 'Summary', section: 'teach', help: 'Remind the child of the key points.' },
  { type: 'reward', emoji: '🏆', name: 'Reward', section: 'reward', help: 'Points and badges. Every mission has one Reward section.' },
]
export const typeInfo = (t) => STEP_TYPES.find((x) => x.type === t) || STEP_TYPES[2]

export const newItem = () => ({ uid: rid(), emoji: '🔹', name: blank(), text: blank(), kid: false })
export const newSortItem = (kind) => ({ uid: rid(), emoji: '🔹', name: blank(), kind, why: blank() })
export function newBlock(type) {
  const uid = rid()
  const section = typeInfo(type).section
  if (section === 'teach') return { uid, type, _open: true, content: { emoji: '📘', title: blank(), lines: [{ text: blank() }], warn: false } }
  if (section === 'procs') return { uid, type, key: 'p_' + rid(), _open: true, content: { emoji: '⚙️', name: blank(), items: [newItem(), newItem()] } }
  if (section === 'quiz') return { uid, type, _open: true, content: { question: blank(), options: [blank(), blank(), blank()], correct: 0, explanation: blank(), media: {} } }
  if (type === 'simulation') return { uid, type, key: 'c_' + rid(), _open: true, content: { type: 'business' } }
  const g1 = 'g_' + rid()
  const g2 = 'g_' + rid()
  return { uid, type, key: 'c_' + rid(), _open: true, content: { type: 'sort', ask: blank(),
    options: [{ kind: g1, icon: '📦', label: blank() }, { kind: g2, icon: '🧺', label: blank() }], items: [newSortItem(g1), newSortItem(g2)] } }
}
export function cloneBlock(b) {
  const c = JSON.parse(JSON.stringify(b))
  const key = (c.key || '').startsWith('c_') ? 'c_' + rid() : 'p_' + rid()
  const items = (c.content.items || []).map((i) => ({ ...i, uid: rid() }))
  return { ...c, id: undefined, uid: rid(), key: c.key ? key : undefined, _open: true, content: { ...c.content, ...(c.content.items ? { items } : {}) } }
}

// ---------- database rows <-> editor state ----------
const OPTIONAL = ['instructions', 'summary', 'why']
const MEDIA = ['image', 'video', 'audio_ha', 'audio_en']
const emptyLang = (x) => x && typeof x === 'object' && !String(x.ha || '').trim() && !String(x.en || '').trim()
// Drops editor-only keys and EMPTY optional fields (an optional text with one language filled is kept, so it is flagged as a missing translation).
export const prune = (v) => {
  if (Array.isArray(v)) return v.map(prune)
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, x] of Object.entries(v)) {
      if (x === undefined || x === null || k.startsWith('_')) continue
      if (MEDIA.includes(k) && !x) continue
      if (OPTIONAL.includes(k) && emptyLang(x)) continue
      o[k] = prune(x)
    }
    return o
  }
  return v
}

const defaultStages = ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward']
const defaultRules = { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], quiz: 5, finish: 10 }

function normChallenge(c) {
  if (c.type === 'business') return { type: 'business' }
  const { kind, ...rest } = c
  if (rest.options && rest.options.length) return { ...rest, type: 'sort', items: (rest.items || []).map((i) => ({ uid: rid(), ...i })) }
  const safety = rest.type === 'safety'
  const pick = (k) => ({ ha: ui.ha[k], en: ui.en[k] })
  const options = safety
    ? [{ kind: 'safe', icon: '✅', label: pick('canDo') }, { kind: 'adult', icon: '🙋', label: pick('askAdult') }]
    : [{ kind: 'resource', icon: '🌍', label: pick('resource') }, { kind: 'product', icon: '📦', label: pick('product') }]
  return { ...rest, type: 'sort', options, ask: pick(safety ? 'safetyAsk' : 'sortAsk'), items: (rest.items || []).map((i) => ({ uid: rid(), ...i })) }
}

export function fromRows(m, rows, qrows) {
  const demo = Object.fromEntries(rows.filter((r) => r.stage === 'demo').map((r) => [r.step_key, r.content]))
  const by = (stage) => rows.filter((r) => r.stage === stage).sort((a, b) => a.position - b.position)
  const teach = by('teach').map((r, i) => {
    const { kind, ...c } = r.content
    return { uid: r.id, id: r.id, type: kind || (i === 0 ? 'story' : 'teach'), content: { emoji: '📘', warn: false, lines: [], title: blank(), ...c } }
  })
  const procs = by('procedure').map((r) => {
    const { kind, steps, result, id, ...c } = r.content
    const items = Array.isArray(c.items) ? c.items : (steps || []).map((k) => demo[k]).filter(Boolean)
    return { uid: r.id, id: r.id, key: r.step_key, type: kind || 'demo', content: { emoji: '⚙️', name: blank(), ...c, items: items.map((i) => ({ uid: rid(), ...i })) } }
  })
  const chals = by('challenge').map((r) => {
    const c = normChallenge(r.content)
    return { uid: r.id, id: r.id, key: r.step_key, type: r.content.kind || (c.type === 'business' ? 'simulation' : 'dragdrop'), content: c }
  })
  const quiz = [...qrows].sort((a, b) => a.position - b.position).map((q) => ({
    uid: q.id, id: q.id, type: 'quiz',
    content: { question: q.question, options: q.options, correct: q.correct_index, explanation: q.explanation, media: q.media || {} } }))
  const rw = { ...defaultRules, ...(m.reward_rules || {}) }
  return {
    m: { ...m, description: m.description && m.description.ha !== undefined ? m.description : blank(), objectives: m.objectives || [],
      stages: (m.stages || defaultStages).filter((s) => defaultStages.includes(s)) },
    eo: m.engine_options || {}, rw, teach, procs, chals, quiz,
  }
}

export function toRows(st) {
  const steps = []
  st.teach.forEach((b, i) => steps.push({ id: b.id, stage: 'teach', step_type: b.type === 'story' ? 'story' : 'explanation', step_key: null, position: i,
    content: prune({ ...b.content, kind: b.type }) }))
  st.procs.forEach((b, i) => steps.push({ id: b.id, stage: 'procedure', step_type: 'demonstration', step_key: b.key, position: i,
    content: prune({ ...b.content, kind: b.type, result: { emoji: b.content.emoji, name: b.content.name } }) }))
  st.chals.forEach((b, i) => steps.push({ id: b.id, stage: 'challenge', step_type: b.content.type === 'business' ? 'simulation' : 'drag_drop', step_key: b.key, position: i,
    content: prune({ ...b.content, key: b.key, kind: b.type }) }))
  const pts = pointsOf(st.rw.quiz) || 5
  const questions = st.quiz.map((b, i) => ({ id: b.id, position: i, question: b.content.question, options: b.content.options,
    correct_index: Math.min(Math.max(0, b.content.correct), Math.max(0, b.content.options.length - 1)),
    explanation: b.content.explanation, points: pts, media: prune(b.content.media || {}) }))
  return { steps, questions }
}

export const pointsOf = (s) => Number(Array.isArray(s) ? s[0] : s) || 0
export const badgeOf = (s) => (Array.isArray(s) ? s[1] || '' : '')
export const rule = (p, b) => (b ? [Number(p) || 0, b] : Number(p) || 0)

export function missionPatch(st) {
  const m = st.m
  const rules = { ...st.rw }
  st.chals.forEach((c) => { if (rules[c.key] === undefined) rules[c.key] = c.content.type === 'business' ? 15 : 5 })
  const stages = defaultStages.filter((s) => s === 'quiz' || s === 'reward' || m.stages.includes(s))
  return {
    emoji: m.emoji || '🛠️', access: m.access || 'free', title: m.title, description: emptyLang(m.description) ? {} : m.description,
    category_id: m.category_id || null, age_min: Number(m.age_min) || 6, age_max: Number(m.age_max) || 12, difficulty: m.difficulty || 'beginner',
    cover_image_path: m.cover_image_path || null, estimated_minutes: m.estimated_minutes ? Number(m.estimated_minutes) : null,
    objectives: m.objectives, stages, reward_rules: rules, engine_options: st.eo,
  }
}

// ---------- missions ----------
export async function listMissions() {
  const [m, e, n] = await Promise.all([
    db.from('missions').select('id,slug,mission_no,emoji,title,status,updated_at,updated_by,published_at').order('mission_no', { ascending: true, nullsFirst: false }),
    db.from('mission_last_edit').select('*'),
    db.rpc('admin_names')])
  fail(m.error)
  return { missions: m.data, edits: Object.fromEntries((e.data || []).map((x) => [x.mission_id, x])), names: Object.fromEntries((n.data || []).map((x) => [x.user_id, x.email])) }
}

export async function createMission({ en, ha, slug, emoji }) {
  const { data: top } = await db.from('missions').select('mission_no').order('mission_no', { ascending: false, nullsFirst: false }).limit(1)
  const no = ((top && top[0] && top[0].mission_no) || 0) + 1
  const { data, error } = await db.from('missions').insert({ slug, mission_no: no, emoji: emoji || '🛠️', title: { ha, en }, description: {},
    status: 'draft', stages: defaultStages, reward_rules: defaultRules, engine_options: {} }).select('id').single()
  fail(error)
  return data.id
}
export async function duplicateMission(id, slug) { const { data, error } = await db.rpc('duplicate_mission', { p_id: id, p_slug: slug }); fail(error); return data }
export async function reorderMissions(ids) { fail((await db.rpc('reorder_missions', { p_ids: ids })).error) }
export async function setStatus(id, status) { fail((await db.from('missions').update({ status }).eq('id', id)).error) }
export async function deleteMission(id) { fail((await db.from('missions').delete().eq('id', id)).error) }
export async function createCategory({ slug, ha, en }) { fail((await db.from('categories').insert({ slug, name: { ha, en } })).error) }

export async function loadFull(id) {
  const [m, s, q, c, r, a, le, nm] = await Promise.all([
    db.from('missions').select('*').eq('id', id).single(),
    db.from('mission_steps').select('*').eq('mission_id', id),
    db.from('game_questions').select('*').eq('mission_id', id),
    db.from('categories').select('*').order('position'),
    db.from('rewards').select('slug,name,active').order('slug'),
    db.from('media_assets').select('*').order('created_at', { ascending: false }),
    db.from('mission_last_edit').select('*').eq('mission_id', id).maybeSingle(),
    db.rpc('admin_names')])
  ;[m, s, q, c, r, a].forEach((x) => fail(x.error))
  return { st: fromRows(m.data, s.data, q.data),
    meta: { categories: c.data, rewards: r.data, assets: a.data, lastEdit: le.data, names: Object.fromEntries((nm.data || []).map((x) => [x.user_id, x.email])) } }
}
export async function loadCategories() { const r = await db.from('categories').select('*').order('position'); fail(r.error); return r.data }
export async function loadAssets() { const r = await db.from('media_assets').select('*').order('created_at', { ascending: false }); fail(r.error); return r.data }

export async function saveFull(id, patch, rows) {
  const [es, eq] = await Promise.all([db.from('mission_steps').select('id').eq('mission_id', id), db.from('game_questions').select('id').eq('mission_id', id)])
  fail(es.error); fail(eq.error)
  const keepS = new Set(rows.steps.filter((s) => s.id).map((s) => s.id))
  const keepQ = new Set(rows.questions.filter((q) => q.id).map((q) => q.id))
  const delS = es.data.map((r) => r.id).filter((x) => !keepS.has(x))
  const delQ = eq.data.map((r) => r.id).filter((x) => !keepQ.has(x))
  if (delS.length) fail((await db.from('mission_steps').delete().in('id', delS)).error)
  if (delQ.length) fail((await db.from('game_questions').delete().in('id', delQ)).error)
  fail((await db.from('missions').update(patch).eq('id', id)).error)
  for (const s of rows.steps.filter((x) => x.id)) {
    fail((await db.from('mission_steps').update({ step_type: s.step_type, step_key: s.step_key, position: s.position, content: s.content }).eq('id', s.id)).error)
  }
  const insS = rows.steps.filter((s) => !s.id).map((s) => ({ mission_id: id, stage: s.stage, step_type: s.step_type, step_key: s.step_key, position: s.position, content: s.content }))
  if (insS.length) fail((await db.from('mission_steps').insert(insS)).error)
  for (const q of rows.questions.filter((x) => x.id)) {
    const { id: qid, ...f } = q
    fail((await db.from('game_questions').update(f).eq('id', qid)).error)
  }
  const insQ = rows.questions.filter((q) => !q.id).map(({ id: _x, ...f }) => ({ mission_id: id, ...f }))
  if (insQ.length) fail((await db.from('game_questions').insert(insQ)).error)
}

// ---------- media ----------
export const MEDIA_RULES = {
  image: { exts: ['png', 'jpg', 'jpeg', 'webp'], max: 3 * 1024 * 1024, label: 'PNG, JPG or WEBP, up to 3 MB' },
  audio: { exts: ['mp3', 'm4a', 'wav', 'ogg', 'webm'], max: 8 * 1024 * 1024, label: 'MP3, M4A, WAV or OGG, up to 8 MB' },
  video: { exts: ['mp4', 'webm', 'gif'], max: 25 * 1024 * 1024, label: 'MP4, WEBM or animated GIF, up to 25 MB' },
}
const CANON = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
  ogg: 'audio/ogg', webm: 'audio/webm', mp4: 'video/mp4' }
const extOf = (f) => (f.name.split('.').pop() || '').toLowerCase()
export const ruleKind = (k) => (k === 'animation' ? 'video' : k)
export function checkFile(kind, file) {
  const r = MEDIA_RULES[kind]
  if (!r.exts.includes(extOf(file))) return 'Unsupported file type. Use ' + r.label + '.'
  if (file.size === 0) return 'The file is empty.'
  if (file.size > r.max) return 'File is too large. Use ' + r.label + '.'
  return null
}
const cache = new Map()
export const forget = (p) => cache.delete(p)
export async function signed(path) {
  if (!path) return null
  const c = cache.get(path)
  if (c && c.exp > Date.now()) return c.url
  const { data, error } = await db.storage.from('media').createSignedUrl(path, 3600)
  if (error || !data) return null
  cache.set(path, { url: data.signedUrl, exp: Date.now() + 3000 * 1000 })
  return data.signedUrl
}
export async function uploadMedia({ file, kind, missionId, missionSlug, language, replace }) {
  const bad = checkFile(kind, file)
  if (bad) throw new Error(bad)
  const ext = extOf(file)
  const path = replace ? replace.path : `${missionSlug || 'shared'}/${kind}/${crypto.randomUUID()}.${ext}`
  const up = await db.storage.from('media').upload(path, file, { contentType: CANON[ext], upsert: Boolean(replace), cacheControl: '3600' })
  fail(up.error)
  const rowKind = ext === 'gif' ? 'animation' : kind
  const fields = { mime_type: CANON[ext], size_bytes: file.size, original_name: file.name, kind: rowKind }
  if (replace) {
    forget(path)
    const r = await db.from('media_assets').update(fields).eq('path', path).select().single()
    fail(r.error)
    return r.data
  }
  const r = await db.from('media_assets').insert({ path, ...fields, mission_id: missionId || null, language: language || null }).select().single()
  if (r.error) { await db.storage.from('media').remove([path]); throw new Error(r.error.message) }
  return r.data
}
export async function mediaUsage(path) { const { data, error } = await db.rpc('media_usage', { p_path: path }); fail(error); return data || [] }
export async function deleteMedia(asset) {
  fail((await db.from('media_assets').delete().eq('id', asset.id)).error)   // refused by the database if a published mission uses it
  fail((await db.storage.from('media').remove([asset.path])).error)
  forget(asset.path)
}
export async function loadLogs() {
  const [l, n] = await Promise.all([db.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(200), db.rpc('admin_names')])
  fail(l.error)
  return { logs: l.data, names: Object.fromEntries((n.data || []).map((x) => [x.user_id, x.email])) }
}
