// Phase 10 — content the adult admin can change in the dashboard: text corrections, recordings, and courses/lessons written there.
// Pure logic + one small in-memory store (no network, no React) so every rule can be tested.
//
// How a piece of text is found (template()):
//   1. a text of a dashboard lesson (keys that start with "cms.")                        — written by the admin in the lesson builder
//   2. a PUBLISHED correction by the admin, but only if it keeps exactly the same {placeholders} as the built-in text
//   3. the built-in text in strings.js (a Hausa DRAFT until a native speaker has reviewed it)
// A recording is used only while the text it was recorded for is unchanged (its fingerprint must still match).
// Words, letters and sentences that the lessons speak are DATA in the course files, not text keys. Each gets a key made from the words themselves
// (spokenKey), so one recording of "gida" serves every lesson that says "gida", and the key can never point at different words.
import { strings } from './strings.js'
import { COURSES, registerCourse, unregisterCourses } from './courses.js'
import { SCREENS } from './digital.js'

export const AREAS_CMS = ['read', 'count', 'apply', 'digital', 'safety', 'other']
// Limits: the SAME numbers as adult_cms_valid() in migration 026 (a test compares them).
export const LIMITS = { title: 100, unit: 100, steps: 20, questions: 12, teach: 600, prompt: 300, option: 120, optionsMin: 2, optionsMax: 5, why: 300, scam: 400, ask: 200, bytes: 60000, courseTitle: 80, courseDesc: 300, text: 1000, audioBytes: 3145728, audioMs: 120000 }
export const CMS_PREFIX = 'cms.'

const store = { over: { ha: {}, en: {} }, dyn: { ha: {}, en: {} }, audio: {}, version: 0, ready: false, client: null }
const listeners = new Set()
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const bump = () => { store.version++; listeners.forEach((f) => f(store.version)) }
export const contentVersion = () => store.version
export const contentReady = () => store.ready
export const setContentReady = (v) => { store.ready = v; bump() }
export const setAudioClient = (c) => { store.client = c }
export const getAudioClient = () => store.client

export const placeholders = (s) => (String(s ?? '').match(/\{[a-zA-Z]+\}/g) || []).sort().join('')
// the text with its {placeholders}, before any values are put in
export function template(lang, key) {
  const d = store.dyn[lang] && store.dyn[lang][key]
  if (d != null && d !== '') return d
  if (key.startsWith(CMS_PREFIX)) { const o = store.dyn[lang === 'ha' ? 'en' : 'ha'][key]; if (o != null && o !== '') return o }
  const base = strings[lang] && strings[lang][key]
  const o = store.over[lang] && store.over[lang][key]
  if (o != null && o !== '' && (base == null || placeholders(o) === placeholders(base))) return o
  return base ?? strings.en[key] ?? key
}
export const hasOverride = (lang, key) => Boolean(store.over[lang] && store.over[lang][key] != null)

export function setOverrides(rows) {
  store.over = { ha: {}, en: {} }
  for (const r of rows || []) if ((r.lang === 'ha' || r.lang === 'en') && typeof r.value === 'string') store.over[r.lang][r.key] = r.value
  bump()
}

// ---- recordings
// 8-hex-digit fingerprint (FNV-1a) of a text: stored with a recording so a changed text does not keep playing the old words
export const fnv = (s) => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0 } return h.toString(16).padStart(8, '0') }
export const SPOKEN_PREFIX = 'sp.'
export const spokenKey = (text) => SPOKEN_PREFIX + fnv(text)
export const isSpokenKey = (k) => typeof k === 'string' && k.startsWith(SPOKEN_PREFIX)
// the fingerprint a recording of this key must carry: for a spoken-words key it is the key itself, otherwise the fingerprint of the current text
export const wantedHash = (lang, key) => (isSpokenKey(key) ? key.slice(SPOKEN_PREFIX.length) : fnv(template(lang, key)))
export function setAudio(rows) {
  store.audio = {}
  for (const r of rows || []) store.audio[r.lang + '|' + r.key] = r
  bump()
}
export const rawClip = (lang, key) => store.audio[lang + '|' + key] || null
// the recording to play for this text, or null if there is none or the text changed after it was recorded
export function clipFor(lang, key) {
  const c = rawClip(lang, key)
  return c && c.text_hash === wantedHash(lang, key) ? c : null
}
export const clipStale = (lang, key) => { const c = rawClip(lang, key); return Boolean(c && c.text_hash !== wantedHash(lang, key)) }

// ---- lessons written in the dashboard
const DYN_LESSONS = new Map()         // lesson key -> { course:'custom', unit, applied:false, area }
export const dynamicLessonInfo = (key) => DYN_LESSONS.get(key) || null
export const dynamicLessons = () => [...DYN_LESSONS.values()].map((v) => v.lesson)
export const dynamicUnitIds = () => [...new Set([...DYN_LESSONS.values()].map((v) => v.unit))]
export const newStepId = () => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s }
export const cmsKey = (lessonKey, stepId, field) => `${CMS_PREFIX}${lessonKey}.${stepId}.${field}`
export const bi = (o) => ({ ha: String((o && o.ha) ?? ''), en: String((o && o.en) ?? '') })

// A dashboard lesson -> the same step shapes the existing lesson player already understands
// (teach/concept, dchoice, tap), with every text registered under a "cms." key so it also has a recording slot.
export function cmsToCourse(course, lessons) {
  const texts = {}
  const reg = (key, b) => { texts[key] = bi(b); return key }
  const titleKey = reg(`${CMS_PREFIX}c.${course.slug}.title`, course.title)
  const units = []; const unitOf = {}
  const out = []
  for (const l of [...lessons].filter((x) => x.course_id === course.id && x.status === 'published').sort((a, b) => a.position - b.position)) {
    const c = l.content || {}
    const ukey = c.unit && c.unit.ha ? fnv(c.unit.ha + '|' + (c.unit.en || '')) : 'main'
    if (!(ukey in unitOf)) { unitOf[ukey] = 'u' + ukey; units.push({ id: 'u' + ukey, titleKey: reg(`${CMS_PREFIX}c.${course.slug}.u.${ukey}`, c.unit && c.unit.ha ? c.unit : course.title), start: 'custom', lessons: [] }) }
    const steps = []
    let n = 0
    for (const s of c.steps || []) {
      const K = (field, b) => reg(cmsKey(l.key, s.id, field), b)
      if (s.type === 'teach') steps.push({ type: 'teach', kind: 'concept', conceptKey: K('text', s.text) })
      else if (s.type === 'choice') {
        const optionKeys = (s.options || []).map((o, i) => K('o' + i, o))
        steps.push({ type: 'dchoice', promptKey: K('prompt', s.prompt), optionKeys, targetKey: optionKeys[s.right], whyKey: s.why && s.why.ha ? K('why', s.why) : null })
      } else if (s.type === 'scam') {
        steps.push({ type: 'dchoice', cardKey: K('text', s.text), promptKey: 'dlScamAsk', optionKeys: n++ % 2 ? ['dlScam', 'dlSafe'] : ['dlSafe', 'dlScam'], targetKey: s.scam ? 'dlScam' : 'dlSafe', whyKey: K('why', s.why) })
      } else if (s.type === 'tap') {
        const els = SCREENS[s.screen]
        if (els && els.some((e) => e.id === s.target && e.kind === 'btn')) steps.push({ type: 'tap', askKey: K('ask', s.ask), screen: s.screen, target: s.target })
      }
    }
    steps.push({ type: 'review' })
    if (steps.length < 2) continue                      // nothing to do in it yet
    const lesson = { key: l.key, unit: unitOf[ukey], title: { key: reg(cmsKey(l.key, 'lesson', 'title'), l.title || c.title), vars: {} }, steps }
    out.push(lesson); units.find((u) => u.id === unitOf[ukey]).lessons.push(lesson)
  }
  const def = { slug: course.slug, kind: 'custom', area: course.skill_area || 'other', units, lessons: out, route: '/adult/c/' + course.slug, titleKey, cms: true }
  return { def, texts }
}

// Register every dashboard course that has published lessons (replaces what was registered before).
export function registerCmsContent(courses, lessons) {
  unregisterCourses((d) => d.cms)
  DYN_LESSONS.clear(); store.dyn = { ha: {}, en: {} }
  for (const course of (courses || []).filter((c) => c.origin === 'cms')) {
    const { def, texts } = cmsToCourse(course, lessons || [])
    for (const [k, v] of Object.entries(texts)) { store.dyn.ha[k] = v.ha || v.en; store.dyn.en[k] = v.en || v.ha }
    if (!def.lessons.length) continue
    registerCourse(def)
    for (const l of def.lessons) DYN_LESSONS.set(l.key, { course: 'custom', unit: l.unit, applied: false, area: def.area, lesson: l })
  }
  bump()
}

// ---- checking a lesson (same rules as the database)
const CTRL = /[\u0001-\u0008\u000b\u000c\u000e-\u001f]/
const biOk = (o, max) => o && typeof o === 'object' && typeof o.ha === 'string' && o.ha.length >= 1 && o.ha.length <= max && !CTRL.test(o.ha)
  && (o.en === undefined || (typeof o.en === 'string' && o.en.length <= max && !CTRL.test(o.en)))
// returns null when the lesson can be published, otherwise a short code naming the first problem
export function validateLessonContent(c) {
  if (!c || typeof c !== 'object' || JSON.stringify(c).length > LIMITS.bytes) return 'shape'
  if (!biOk(c.title, LIMITS.title)) return 'title'
  if (c.unit != null && !biOk(c.unit, LIMITS.unit)) return 'unit'
  if (!Array.isArray(c.steps) || c.steps.length < 1 || c.steps.length > LIMITS.steps) return 'steps'
  const ids = new Set(); let q = 0
  for (const s of c.steps) {
    if (!s || typeof s !== 'object' || !/^[a-z0-9]{6,12}$/.test(s.id || '') || ids.has(s.id)) return 'stepId'
    ids.add(s.id)
    if (s.type === 'teach') { if (!biOk(s.text, LIMITS.teach)) return 'teach' }
    else if (s.type === 'choice') {
      q++
      if (!biOk(s.prompt, LIMITS.prompt)) return 'prompt'
      if (!Array.isArray(s.options) || s.options.length < LIMITS.optionsMin || s.options.length > LIMITS.optionsMax || !s.options.every((o) => biOk(o, LIMITS.option))) return 'options'
      if (new Set(s.options.map((o) => o.ha)).size !== s.options.length) return 'optionsSame'
      if (!Number.isInteger(s.right) || s.right < 0 || s.right >= s.options.length) return 'right'
      if (s.why != null && !biOk(s.why, LIMITS.why)) return 'why'
    } else if (s.type === 'scam') {
      q++
      if (!biOk(s.text, LIMITS.scam) || !biOk(s.why, LIMITS.why) || typeof s.scam !== 'boolean') return 'scam'
    } else if (s.type === 'tap') {
      q++
      const els = SCREENS[s.screen]
      if (!biOk(s.ask, LIMITS.ask) || !/^[a-z0-9_]{1,30}$/.test(s.screen || '') || !/^[a-z0-9_]{1,30}$/.test(s.target || '')) return 'tap'
      if (!els || !els.some((e) => e.id === s.target && e.kind === 'btn')) return 'tapTarget'
    } else return 'type'
  }
  return q > LIMITS.questions ? 'questions' : null
}

// which text keys a built-in lesson uses (so the admin can correct and record them): its title and every step value that names a text
export function lessonTextKeys(lesson) {
  const keys = new Set()
  const add = (v) => { if (typeof v === 'string' && v in strings.en) keys.add(v) }
  if (lesson.title && lesson.title.key) add(lesson.title.key)
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); else add(o) }
  walk(lesson.steps)
  return [...keys]
}
// ---- what a built-in lesson says aloud, so every piece can be recorded (and so the hint "your phone cannot speak Hausa" knows what is covered)
const fill = (str, vars) => { let o = str; for (const v in vars || {}) o = o.split('{' + v + '}').join(vars[v]); return o }
export const render = (lang, key, vars) => fill(template(lang, key), vars)
// Returns [{ key, lang, text, label }] — one entry per thing the player speaks in this lesson (duplicates removed).
export function spokenItems(lesson) {
  const out = []; const seen = new Set()
  const add = (key, lang, text, label) => { const id = lang + '|' + key; if (text && !seen.has(id)) { seen.add(id); out.push({ key, lang, text, label }) } }
  const words = (text, label) => add(spokenKey(text), 'ha', text, label)          // Hausa words are spoken with a Hausa voice whatever the screen language
  const keyed = (key, label) => { for (const l of ['ha', 'en']) add(key, l, template(l, key), label) }
  for (const st of lesson.steps || []) {
    if (st.type === 'teach') {
      if (st.kind === 'letter') { for (const l of ['ha', 'en']) { const text = render(l, 'teachLetter', { upper: st.letter, lower: st.lower, word: st.word }); add(spokenKey(text), l, text, 'letter') } words(st.word, 'word') }
      else if (st.kind === 'digit' || st.kind === 'word') words(st.word, st.kind)
      else if (st.kind === 'sentence' || st.kind === 'message') words(st.sentence, st.kind)
      else if (st.kind === 'concept') keyed(st.conceptKey, 'teaching')
    } else if (st.type === 'find' && (st.kind === 'sameWord' || st.kind === 'sameSentence')) words(st.target, 'find')
    else if (st.type === 'dchoice') { if (st.cardKey) keyed(st.cardKey, 'message'); keyed(st.promptKey, 'question') }
    else if (st.type === 'tap') keyed(st.askKey, 'instruction')
  }
  return out
}
export const spokenItemsOfCourse = (def) => { const seen = new Set(); const out = []; for (const l of (def && def.lessons) || []) for (const it of spokenItems(l)) { const id = it.lang + '|' + it.key; if (!seen.has(id)) { seen.add(id); out.push(it) } } return out }
// how many of these items have a recording that still matches its words
export const coverage = (items) => { let done = 0; for (const it of items || []) if (clipFor(it.lang, it.key)) done++; return { total: (items || []).length, done } }
// ---- texts on the signed-in learner screens that have a Listen button. Only fixed texts (no name or number inside) can be recorded.
export const SCREEN_TEXTS = [
  { id: 'home', keys: ['tabCourses', 'homeNoAssessment', 'yourStart', 'lessonsSoon'] },
  { id: 'courses', keys: ['comingSoon', 'lessonsNotYet', 'courseExpired', 'joined'] },
  { id: 'progress', keys: ['mpIntro', 'mpNothing', 'mpCanDo', 'mpSolidNote', 'mpPractise', 'mpWeeks', 'mpNext', 'mpNote'] },
  { id: 'write', keys: ['practiceNote'] },
  { id: 'help', keys: ['helpText'] },
]
// plus the course names and section names of the built-in courses (the course list screen)
export function screenGroups() {
  const keys = []
  for (const c of Object.values(COURSES)) if (!c.cms) { keys.push(c.titleKey); for (const u of c.units) keys.push(u.titleKey) }
  return [...SCREEN_TEXTS, { id: 'lists', keys: [...new Set(keys)] }]
}
export const isLessonKeyName = (k) => /^(d[tcqowm]_|du_|ds_|dl[A-Z])/.test(k)
export { COURSES }
