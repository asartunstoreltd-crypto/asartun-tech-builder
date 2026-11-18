// Tests for ASARTUN ADULT LEARNING (phase 3). Run: npm run test:adult   (plain Node, no dependencies)
// Covers: phone/PIN rules (and that the Edge Function repeats them), assessment items + scoring + recommendation,
// translations (both languages, every key used in the code exists), and structural checks of the SQL migrations.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { normalizePhone, pinProblem, loginName, LOGIN_DOMAIN } from '../src/adult/phone.js'
import { ITEMS, DOMAINS, scoreAnswers, recommend } from '../src/adult/assessment.js'
import { strings } from '../src/adult/strings.js'
import { GLYPHS, HAUSA_LETTERS, canGuide, layoutText, scoreTrace, suggestAspect } from '../src/adult/guide.js'
import { LESSONS, UNITS, LETTER_WORDS, WORDS, SENTENCES, MESSAGES, lessonByKey, firstLessonFor, nameForGuide, nameCanGuide } from '../src/adult/curriculum.js'
import { needsPractice, summarize, TRACE_OK } from '../src/adult/progress.js'
import { LITERACY_START, NUMERACY_START } from '../src/adult/assessment.js'
import * as num from '../src/adult/numeracy.js'
import { COURSES, ALL_LESSONS, courseOfLesson, firstLessonOf, nextInCourse, lessonByKey as anyLessonByKey } from '../src/adult/courses.js'
import { aggregateResults, RESULT_KEYS } from '../src/adult/progress.js'
import { ALLOWED_TYPES, MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, TARGET_BYTES, validatePhoto, fitSize, photoSettings, qualitySteps, photoPath, photoPathOk, simplifyStrokes } from '../src/adult/imageTools.js'
import { workState, canSend, STATE_KEY } from '../src/adult/work.js'

let fail = 0, n = 0
const ok = (c, m) => { n++; if (!c) { fail++; console.log('✗', m) } }
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`)

// ---------- phone ----------
eq(normalizePhone('08031234567'), '+2348031234567', 'NG 080')
eq(normalizePhone('0803 123 4567'), '+2348031234567', 'spaces')
eq(normalizePhone('+234 803 123 4567'), '+2348031234567', '+234')
eq(normalizePhone('2348031234567'), '+2348031234567', '234 no plus')
eq(normalizePhone('002348031234567'), '+2348031234567', '00 prefix')
eq(normalizePhone('07012345678'), '+2347012345678', '070')
eq(normalizePhone('09012345678'), '+2349012345678', '090')
eq(normalizePhone('+14155550123'), '+14155550123', 'foreign E.164')
for (const bad of ['', '123', 'abc', '0123456789', '0803123456', '080312345678', null, undefined]) eq(normalizePhone(bad), null, 'reject ' + bad)
eq(loginName('+2348031234567'), '2348031234567@' + LOGIN_DOMAIN, 'loginName')
ok(/^[0-9]+@[a-z.]+$/.test(loginName('+2348031234567')), 'loginName is a plain address')

// ---------- PIN ----------
eq(pinProblem('483920'), null, 'good pin')
eq(pinProblem('12345'), 'pinSix', 'short'); eq(pinProblem('1234567'), 'pinSix', 'long'); eq(pinProblem('12a456'), 'pinSix', 'letters')
eq(pinProblem('000000'), 'pinSame', 'same'); eq(pinProblem('777777'), 'pinSame', 'same 7')
eq(pinProblem('123456'), 'pinSeq', 'ascending'); eq(pinProblem('345678'), 'pinSeq', 'ascending mid'); eq(pinProblem('654321'), 'pinSeq', 'descending'); eq(pinProblem('901234'), 'pinSeq', 'wraps')
eq(pinProblem('112233'), 'pinWeak', 'weak list')

// ---------- the Edge Function repeats the same rules ----------
{
  const fn = readFileSync('supabase/functions/adult-admin/index.ts', 'utf8').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  ok(fn.includes("action === 'self_register'") && fn.includes("action === 'create_learner'"), `adult-admin/index.ts is not the ASARTUN adult function (${fn.length} characters, starts: ${JSON.stringify(fn.slice(0, 60))}). It was probably replaced by a stub from 'supabase functions new' or the dashboard editor: restore the file from the zip before deploying.`)
  const lists = (s) => [...s.matchAll(/\['(\d{6})'(?:, '(\d{6})')*[^\]]*\]/g)]
  ok(/\['112233', '121212', '123123', '111222', '123321'\]/.test(fn), 'function weak-PIN list matches phone.js')
  ok(fn.includes("'01234567890123456789'") && fn.includes("'98765432109876543210'"), 'function sequence rule matches')
  ok(fn.includes('/^0[789][01][0-9]{8}$/') && fn.includes('/^234[0-9]{10}$/') && fn.includes('/^00[0-9]{10,15}$/') && fn.includes('/^\\+[0-9]{10,15}$/'), 'function phone patterns match')
  ok(fn.includes("'adult.asartun.invalid'") && LOGIN_DOMAIN === 'adult.asartun.invalid', 'default login domain identical in app and function')
  ok(!/SERVICE_ROLE/.test(readFileSync('src/adult/adultSupabase.js', 'utf8')), 'service key not referenced in app code')
  void lists
}

// ---------- assessment items ----------
ok(new Set(ITEMS.map((i) => i.id)).size === ITEMS.length, 'item ids unique')
ok(ITEMS.length === 12, '12 items')
ok(ITEMS.every((i) => DOMAINS.includes(i.domain)), 'item domains valid')
ok(DOMAINS.every((d) => ITEMS.some((i) => i.domain === d)), 'every domain has an item')
ok(ITEMS.every((i) => /^[a-z0-9_]{1,30}$/.test(i.id)), 'ids fit the database check')
for (const i of ITEMS.filter((x) => x.kind === 'choice')) ok(i.options.includes(i.target) && new Set(i.options).size === i.options.length, `choice ${i.id}: target among unique options`)
for (const i of ITEMS.filter((x) => x.kind === 'write_check' && x.id !== 'w2_name')) ok(typeof i.answer === 'string' && i.answer.length > 0, `write_check ${i.id} has an answer`)
ok(ITEMS.find((i) => i.id === 'c1_add').answer === String(7 + 5), 'sum 7+5')
ok(ITEMS.find((i) => i.id === 'c2_sub').answer === String(9 - 4), 'sum 9-4')
ok(ITEMS.find((i) => i.id === 'n2_count').dots === Number(ITEMS.find((i) => i.id === 'n2_count').target), 'dots equal the target')
for (const i of ITEMS) ok(strings.ha['ip_' + i.id] && strings.en['ip_' + i.id], `prompt text for ${i.id}`)

// ---------- scoring ----------
const all = (res) => ITEMS.map((i) => ({ id: i.id, result: res, source: 'self' }))
eq(Object.values(scoreAnswers(all('yes'))), [3, 3, 3, 3, 3, 3], 'all yes -> level 3')
eq(Object.values(scoreAnswers(all('no'))), [0, 0, 0, 0, 0, 0], 'all no -> level 0')
eq(Object.values(scoreAnswers(all('help'))), [1, 1, 1, 1, 1, 1], 'all help -> level 1')
{
  const s = scoreAnswers(ITEMS.map((i) => ({ id: i.id, result: 'skipped', source: 'self' })))
  eq(Object.values(s), [null, null, null, null, null, null], 'all skipped -> no levels (not zeros)')
  const r = recommend(s)
  ok(r.literacy.level === null && r.literacy.start === null && r.numeracy.start === null && r.digital.ready === null && r.complete === false && r.notAssessed.length === 6, 'nothing assessed -> says so')
}
{ // self mode skips the facilitator-only item: letters still scored from the other one
  const a = ITEMS.filter((i) => !i.staffOnly).map((i) => ({ id: i.id, result: 'yes', source: 'self' }))
  const s = scoreAnswers(a); eq(s.letters, 3, 'letters from remaining item'); ok(recommend(s).complete, 'all domains still covered in self mode')
}
{ // typical beginner: recognises few letters, cannot write, can count a bit
  const m = { l1_recognize: 'no', l2_sound: 'no', w1_letter: 'no', w2_name: 'help', w3_word: 'no', r1_word: 'no', r2_sentence: 'no', n1_recognize: 'yes', n2_count: 'yes', c1_add: 'help', c2_sub: 'no', p1_phone: 'yes' }
  const s = scoreAnswers(Object.entries(m).map(([id, result]) => ({ id, result, source: 'self' }))); const r = recommend(s)
  eq(r.literacy.start, 'letters', 'beginner literacy start'); eq(r.numeracy.level, 1, 'numeracy level 1'); eq(r.numeracy.start, 'add_sub', 'numeracy start')
  eq(r.digital.ready, false, 'not ready for digital')
}
{ // confident reader, weak sums
  const m = Object.fromEntries(ITEMS.map((i) => [i.id, 'yes'])); m.c1_add = 'no'; m.c2_sub = 'no'
  const r = recommend(scoreAnswers(Object.entries(m).map(([id, result]) => ({ id, result, source: 'self' }))))
  eq(r.literacy.start, 'practical', 'strong literacy'); eq(r.numeracy.start, 'numbers', 'weak calc starts from numbers'); eq(r.digital.ready, true, 'ready for digital')
}
{ // partial: one domain known only; digital unknown without phone answer
  const r = recommend(scoreAnswers([{ id: 'n1_recognize', result: 'yes', source: 'auto' }, { id: 'n2_count', result: 'yes', source: 'auto' }]))
  eq(r.numeracy.level, 3, 'numeracy from numbers only'); eq(r.literacy.level, null, 'literacy unknown'); eq(r.digital.ready, null, 'digital unknown'); ok(!r.complete, 'incomplete')
}

// ---------- translations ----------
const kha = Object.keys(strings.ha), ken = Object.keys(strings.en)
eq(kha, ken, 'same keys in both languages')
for (const k of kha) { ok(strings.ha[k].trim() && strings.en[k].trim(), `empty text: ${k}`); const v = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join(); ok(v(strings.ha[k]) === v(strings.en[k]), `placeholders differ: ${k}`) }
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|js)$/.test(f) ? [p] : [] })
const src = walk('src/adult').filter((f) => !f.endsWith('strings.js'))
const used = new Set()
for (const f of src) {
  const code = readFileSync(f, 'utf8')
  for (const m of code.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*[,)]/g)) used.add(m[1])
  for (const m of code.matchAll(/'((?:err|pin|tab|mode|t)[A-Z][A-Za-z]*)'/g)) used.add(m[1])        // keys held in lookup tables
  for (const m of code.matchAll(/\['[a-z]+', '((?:tab)[A-Za-z]+)'\]/g)) used.add(m[1])
  for (const m of code.matchAll(/\bt\(\s*(?:label|l|k)\b/g)) void m
}
for (const k of ['resLiteracy', 'resNumeracy', 'resLiteracyName', 'resNumeracyName', 'modePhysical', 'modeOnline', 'modeBoth', 'modeAssisted', 'modeSelf']) used.add(k)
for (const d of DOMAINS) used.add('dom_' + d)
for (const s of ['letters', 'words', 'sentences', 'practical', 'numbers', 'add_sub', 'mult_div', 'money']) used.add('start_' + s)
for (const k of used) ok(kha.includes(k), `string key used in code but missing: ${k}`)
{ // no unused clutter: every key is referenced somewhere (static or by the dynamic families above)
  const text = src.map((f) => readFileSync(f, 'utf8')).join('\n')
  for (const k of kha) { const dyn = /^(ip_|dom_|start_|resLiteracyName|resNumeracyName|reviewWrite_)/.test(k); ok(dyn || text.includes("'" + k + "'") || text.includes('t(\'' + k + '\''), `string key never used: ${k}`) }
}

// ---------- SQL structure ----------
const sqlDir = 'supabase/migrations'
const sql = readdirSync(sqlDir).filter((f) => /^0(1[789]|2[01])_adult/.test(f)).map((f) => readFileSync(join(sqlDir, f), 'utf8')).join('\n')
const tables = [...sql.matchAll(/create table if not exists public\.(adult_[a-z_]+)/g)].map((m) => m[1])
ok(tables.length >= 10, 'found adult tables: ' + tables.length)
for (const t of tables) ok(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(sql), `RLS enabled on ${t}`)
for (const t of tables) ok(!/\bprofiles\b/.test((sql.match(new RegExp(`create table if not exists public\\.${t} \\([\\s\\S]*?\\n\\);`)) || [''])[0].replace(/adult_profiles/g, '')), `${t} does not reference children's profiles`)
ok(!/drop\s+(table|function|policy)\s+(?!if exists "?adult|if exists public\.adult)/i.test(sql.replace(/drop (policy|trigger) if exists[^;]*;/gi, '')), 'no destructive statements outside adult_ objects')
ok(!/\b(alter|drop)\s+table\s+public\.(profiles|missions|entitlements|payment_requests|organizations|org_members)\b/i.test(sql), 'children/org tables untouched')
const defs = [...sql.matchAll(/create or replace function public\.(adult_[a-z_]+|is_adult_[a-z]+|staff_can_see_learner)\([^)]*\)[\s\S]*?as \$\$[\s\S]*?\$\$;/g)]
ok(defs.length >= 12, 'functions found: ' + defs.length)
for (const m of defs) ok(/security definer set search_path = ''/.test(m[0]), `${m[1]}: security definer with empty search_path`)
for (const m of defs) if (!/adult_expired_submissions|adult_purge_delete/.test(m[1]) && !/staff_can_see_learner|is_adult_staff|is_adult_learner|adult_can_manage_class|adult_can_manage_assignment|adult_learner_in_assignment_class|adult_feedback_visible|adult_log\b|adult_touch|auth\.uid\(\)/.test(m[0].slice(m[0].indexOf('as $$')))) ok(false, `${m[1]}: no caller check`)
ok(/grant select on[\s\S]*to authenticated/.test(sql) && !/grant (insert|delete|all)/i.test(sql), 'browser role gets SELECT only')
ok(/grant update \(display_name, language, low_data, audio_on\) on public\.adult_profiles/.test(sql), 'learner can edit only comfort settings')
ok(!/m\.class_id = id\b/.test(sql) && /m\.class_id = public\.adult_classes\.id/.test(sql), 'class policy compares the CLASS id (an unqualified id would bind to the member row)')
ok(/revoke execute on function public\.adult_log/.test(sql), 'adult_log not callable by browser')
ok(!/service_role/i.test(sql.replace(/--.*$/gm, '').replace(/grant execute on function [^;]* to service_role;/g, '')), 'no service key in SQL (only the grant of the retention functions to the service role)')
ok(/unique \(learner_id, client_uuid\)/.test(sql), 'assessment retry is idempotent')
ok(/phone ~ '\^\\\+\[0-9\]\{10,15\}\$'/.test(sql), 'database re-checks phone format')


// ---------- guided handwriting: guides, layout, tracing check (phase 4) ----------
{
  let seed = 12345; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const trace = (g, { noise = 0, drop = 0, off = 0 } = {}) => g.strokes.slice(0, g.strokes.length - drop).map((st) => ({ tool: 'pen', pts: st.pts.map(([x, y]) => [x + off + (rnd() - 0.5) * noise, y + (rnd() - 0.5) * noise]) }))
  eq(HAUSA_LETTERS.length, 26, '26 Hausa letters have guides')
  for (const L of 'ABCDEFGHIJKLMNORSTUWYZƁƊƘƳ') ok(GLYPHS[L], 'glyph for ' + L)
  for (const [c, strokes] of Object.entries(GLYPHS)) {
    ok(strokes.length >= 1, `${c} has strokes`)
    for (const st of strokes) { ok(st.length >= 2 || c === '.', `${c} stroke has points`); ok(st.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100), `${c} inside the 100 box`) }
  }
  ok(canGuide('Musa') && canGuide('GIDA.') && canGuide('INA\nGIDA.') && !canGuide('PETER') && !canGuide('Q'), 'canGuide')
  eq(layoutText('PETER', 2), null, 'no layout for letters outside the alphabet')
  const texts = [...HAUSA_LETTERS, ...WORDS.map((w) => w[0].toUpperCase()), ...SENTENCES.map((x) => x[0].toUpperCase().split(' ').join('\n'))]
  for (const tx of texts) {
    const a = suggestAspect(tx), g = layoutText(tx, a)
    ok(g && g.strokes.every((st) => st.pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)), `layout of ${JSON.stringify(tx)} stays inside the canvas`)
    ok(g.glyphHeight >= 0.2, `letters in ${JSON.stringify(tx)} are big enough to trace (${g.glyphHeight.toFixed(2)} of canvas height)`)
    ok(scoreTrace(g, trace(g)).ok, `perfect trace of ${JSON.stringify(tx)} passes`)
    ok(scoreTrace(g, trace(g, { noise: 0.04 })).ok, `wobbly trace of ${JSON.stringify(tx)} passes`)
    ok(!scoreTrace(g, trace(g, { off: 0.15 })).ok, `trace of ${JSON.stringify(tx)} shifted far off the guide fails`)
  }
  for (const L of HAUSA_LETTERS) { const g = layoutText(L, 1.4); if (g.strokes.length > 1) ok(!scoreTrace(g, trace(g, { drop: 1 })).ok, `${L}: leaving out the last stroke fails`) }
  for (const [hooked, plain] of [['Ɓ', 'B'], ['Ɗ', 'D'], ['Ƙ', 'K'], ['Ƴ', 'Y']]) {
    const g = layoutText(hooked, 1.4), p = layoutText(plain, 1.4)
    ok(!scoreTrace(g, trace(p)).ok, `plain ${plain} traced over ${hooked} (hook left out) fails`)
    ok(scoreTrace(g, trace(g)).ok, `${hooked} traced with its hook passes`)
  }
  for (const tx of texts) { const g = layoutText(tx, suggestAspect(tx)); const good = scoreTrace(g, trace(g, { noise: 0.04 })), bad = scoreTrace(g, trace(g, { off: 0.15 })); ok(good.score >= TRACE_OK && bad.score < TRACE_OK, `score and pass agree for ${JSON.stringify(tx)}`) }
  { const g = layoutText('BABA', suggestAspect('BABA')); ok(!scoreTrace(g, trace(g, { drop: Math.floor(g.strokes.length / 2) })).ok, 'half of a word traced fails') }
  { const g = layoutText('A', 1.25); const scrib = [{ tool: 'pen', pts: Array.from({ length: 300 }, () => [rnd() * 0.9 + 0.05, rnd() * 0.9 + 0.05]) }]; ok(!scoreTrace(g, scrib).ok, 'scribble fails'); eq(scoreTrace(g, []).ok, false, 'no ink fails'); eq(scoreTrace(g, [{ tool: 'eraser', pts: [[0.5, 0.5]] }]).score, 0, 'eraser strokes are not ink') }
  for (const [a, b] of [['A', 'O'], ['T', 'O'], ['L', 'O'], ['I', 'O'], ['Z', 'O'], ['H', 'O'], ['E', 'O'], ['O', 'T'], ['W', 'L']]) { const g = layoutText(a, 1.4), other = layoutText(b, 1.4); ok(!scoreTrace(g, trace(other)).ok, `${b} traced over ${a} guide fails`) }
}

// ---------- curriculum ----------
{
  eq(UNITS.map((u) => u.lessons.length), [26, 10, 1, 5, 3], 'unit sizes')
  eq(LESSONS.length, 45, '45 lessons')
  ok(new Set(LESSONS.map((l) => l.key)).size === LESSONS.length, 'lesson keys unique')
  ok(LESSONS.every((l) => /^[a-z0-9-]{1,40}$/.test(l.key)), 'lesson keys fit the database check')
  ok(LESSONS.every((l) => l.steps.at(-1).type === 'review' && l.steps.filter((x) => x.type === 'review').length === 1), 'every lesson ends with exactly one review')
  const TYPES = ['teach', 'show', 'trace', 'write', 'match', 'find', 'review']
  ok(LESSONS.every((l) => l.steps.every((x) => TYPES.includes(x.type)) && l.steps[0].type === 'teach'), 'valid step types, lessons start by teaching')
  ok(LESSONS.filter((l) => l.unit === 'letters').every((l) => ['teach', 'show', 'trace', 'write', 'match', 'find', 'review'].join() === l.steps.map((x) => x.type).join()), 'letter lessons follow teach > show > trace > write > check > review')
  for (const u of UNITS) { ok(strings.ha[u.titleKey] && strings.en[u.titleKey], 'unit title ' + u.id) }
  for (const l of LESSONS) { const tk = l.title.key; ok(strings.ha[tk] && strings.en[tk], 'lesson title key ' + tk); for (const v of Object.keys(l.title.vars)) ok(strings.ha[tk].includes('{' + v + '}') && strings.en[tk].includes('{' + v + '}'), `${tk} uses {${v}}`) }
  for (const [L, [w, gloss]] of Object.entries(LETTER_WORDS)) { ok(w.toUpperCase().includes(L), `example word ${w} contains ${L}`); ok(gloss.length > 0, 'gloss for ' + w); ok(GLYPHS[L], 'guide for ' + L) }
  eq(Object.keys(LETTER_WORDS).sort(), HAUSA_LETTERS.slice().sort(), 'every Hausa letter has exactly one lesson')
  for (const [w] of WORDS) ok(canGuide(w), `word ${w} can be traced`)
  for (const [x] of [...SENTENCES, ...MESSAGES]) ok(canGuide(x), `text ${x} uses only guided letters`)
  for (const l of LESSONS) for (const st of l.steps) {
    if (st.type === 'match') { ok(st.options.includes(st.target) && new Set(st.options).size === st.options.length && st.options.length >= 3, `${l.key} match options`); ok(st.prompt === st.target.toLowerCase(), `${l.key} match shows the lower-case form`); ok(st.options.filter((o) => o === st.target).length === 1, `${l.key} one right answer`) }
    if (st.type === 'find') {
      ok(st.options.includes(st.target) && new Set(st.options).size === st.options.length && st.options.length === 3, `${l.key} find options`)
      if (st.kind === 'hasLetter') eq(st.options.filter((o) => o.toUpperCase().includes(st.letter)), [st.target], `${l.key}: exactly one option has the letter`)
    }
  }
  for (const m of MESSAGES) ok(m[2].includes(m[0]) && new Set(m[2]).size === 3, 'message options')
  for (const st of LITERACY_START) ok(UNITS.some((u) => u.start === st), `assessment start "${st}" has a unit`)
  for (const st of LITERACY_START) ok(firstLessonFor(st) && lessonByKey(firstLessonFor(st).key), `first lesson for ${st}`)
  eq(firstLessonFor(null).key, 'letter-01', 'unknown start -> first letter')
  eq(nameForGuide('Musa Ibrahim'), 'MUSA', 'first name'); eq(nameForGuide('  '), '', 'empty name')
  for (const n of ['MUSA', 'AISHA', 'FATIMA', 'HAUWA', 'YUSUF', 'IBRAHIM', 'ABDULLAHI', 'ƘARAMA']) ok(nameCanGuide(n), n + ' can be guided')
  for (const n of ['PETER', 'VICTOR', '', 'ABCDEFGHIJKLM']) ok(!nameCanGuide(n), `${JSON.stringify(n)} falls back to free writing`)
  ok(lessonByKey('nope') === null, 'unknown lesson key')
}

// ---------- progress rules ----------
{
  ok(!needsPractice(null) && !needsPractice({ best_trace: '0.90', write_rating: 'yes', last_results: { match: 'yes', find: 'yes' } }), 'good lesson needs no practice')
  ok(needsPractice({ best_trace: '0.40', write_rating: 'yes', last_results: {} }), 'poor tracing -> practise')
  ok(needsPractice({ best_trace: null, write_rating: 'no', last_results: {} }), 'could not write -> practise')
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { find: 'no' } }), 'wrong reading choice -> practise')
  ok(!needsPractice({ best_trace: null, write_rating: 'help', last_results: {} }), 'writing with help alone is not flagged')
  ok(Math.abs(TRACE_OK - 0.85 * 0.8) < 1e-9, 'TRACE_OK equals the pass thresholds multiplied')
  const keys = ['a', 'b', 'c', 'd']
  const sum = summarize([{ lesson_key: 'a', status: 'completed', best_trace: '0.9', last_results: {} }, { lesson_key: 'b', status: 'completed', best_trace: '0.3', last_results: {} }, { lesson_key: 'c', status: 'started', last_results: {} }], keys)
  eq([sum.completed, sum.practice, sum.next, sum.total], [2, ['b'], 'c', 4], 'summary: completed is not the same as learned')
  eq(summarize([], keys).next, 'a', 'next lesson when nothing done'); eq(summarize(keys.map((k) => ({ lesson_key: k, status: 'completed', last_results: {} })), keys).next, null, 'nothing next when all done')
}

// ---------- phase 4 wiring: app and database agree ----------
{
  const keysSent = Object.keys(aggregateResults([], {})).sort()
  eq(keysSent, RESULT_KEYS.slice().sort(), 'aggregateResults produces exactly RESULT_KEYS')
  const sql20 = readFileSync('supabase/migrations/020_adult_numeracy_progress.sql', 'utf8')
  { // read the allow-list the database function actually uses, not just any mention of the word
    const allowed = new Set()
    for (const line of sql20.split('\n')) if (/^\s*(if|elsif) k (=|in)/.test(line)) for (const m of line.matchAll(/'([A-Za-z]+)'/g)) allowed.add(m[1])
    for (const k of keysSent) ok(allowed.has(k), `database (020) validates result key ${k}`)
    eq([...allowed].filter((k) => !keysSent.includes(k)), [], 'database allows no result key the app does not send')
  }
  ok(/best_calc = case when calc is null/.test(sql20) && /pickRight[\s\S]*pickTotal/.test(sql20), 'database keeps best_calc and checks pickRight <= pickTotal')
  const sql19 = readFileSync('supabase/migrations/019_adult_lesson_progress.sql', 'utf8')
    ok(/not enrolled/.test(sql19) && /ends_at is null or e\.ends_at > now\(\)/.test(sql19), 'recording needs a live enrolment')
  ok(/last_client = p_client/.test(sql19), 'retry of the same run is not counted twice')
  ok(/case when r\.status = 'completed' then 'completed'/.test(sql19), 'completed never goes back')
  ok(/lesson_key ~ '\^\[a-z0-9-\]\{1,40\}\$'/.test(sql19), 'database re-checks lesson key shape')
  ok(!/(insert|update|delete)\s+(into|on)?\s*public\.adult_lesson_progress[^;]*to authenticated/i.test(sql19) && !/grant (insert|update|delete)/i.test(sql19), 'progress is written only through the function')
  const speech = readFileSync('src/adult/speech.js', 'utf8'), audio = readFileSync('src/adult/components/AdultAudio.jsx', 'utf8')
  ok(/voiceFor\(lang\)/.test(speech) && /if \(!synth \|\| !v/.test(speech), "phone voice is used only when it has a voice for that language")
  ok(/canSpeak = Boolean\(text\) && hasVoice\(l\)/.test(audio) && /\(!file && !canSpeak\)\) \|\| /.test(audio) || /if \(\(!file && !canSpeak\)/.test(audio), 'no listen button without a voice or recording')
  ok(!/fetch\(|XMLHttpRequest|https?:\/\//.test(speech), 'speech uses no network')
}


// ---------- PHASE 5: digits, numeracy curriculum, handwritten maths ----------
{
  let seed = 777; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const trace = (g, { noise = 0, drop = 0, off = 0 } = {}) => g.strokes.slice(0, g.strokes.length - drop).map((st) => ({ tool: 'pen', pts: st.pts.map(([x, y]) => [x + off + (rnd() - 0.5) * noise, y + (rnd() - 0.5) * noise]) }))
  // --- digit guides
  for (const d of '0123456789') ok(GLYPHS[d], 'glyph for digit ' + d)
  eq(HAUSA_LETTERS.length, 26, 'digits do not leak into the letter list')
  ok(canGuide('150') && canGuide('7') && !canGuide('1,5'), 'canGuide with digits')
  for (const tx of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '12', '15', '40', '90', '100']) {
    const a = suggestAspect(tx), g = layoutText(tx, a)
    ok(g && g.strokes.every((st) => st.pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)), `layout of ${tx} inside canvas`)
    ok(g.glyphHeight >= 0.3, `digits in ${tx} big enough (${g.glyphHeight.toFixed(2)})`)
    ok(scoreTrace(g, trace(g)).ok && scoreTrace(g, trace(g, { noise: 0.04 })).ok, `trace of ${tx} passes`)
    ok(!scoreTrace(g, trace(g, { off: 0.15 })).ok, `shifted trace of ${tx} fails`)
    if (g.strokes.length > 1) ok(!scoreTrace(g, trace(g, { drop: 1 })).ok, `${tx}: missing stroke fails`)
  }
  for (const [a, b] of [['1', '0'], ['7', '0'], ['4', '0'], ['2', '0'], ['1', '8'], ['0', '1']]) ok(!scoreTrace(layoutText(a, 1.25), trace(layoutText(b, 1.25))).ok, `${b} traced over ${a} fails`)

  // --- course registry
  ok(Object.keys(COURSES).length === 2 && COURSES['basic-numeracy'].lessons === num.LESSONS, 'two courses registered')
  ok(new Set(ALL_LESSONS.map((l) => l.key)).size === ALL_LESSONS.length, 'lesson keys unique across both courses')
  ok(ALL_LESSONS.every((l) => courseOfLesson(l.key) && anyLessonByKey(l.key) === l), 'every lesson belongs to exactly one course')
  ok(ALL_LESSONS.every((l) => /^[a-z0-9-]{1,40}$/.test(l.key)), 'all keys fit the database check')
  eq(nextInCourse(num.LESSONS.at(-1).key), null, 'no "next lesson" across courses'); eq(nextInCourse('n-digit-0').key, 'n-digit-1', 'next lesson in numeracy')
  eq(NUMERACY_START, ['numbers', 'add_sub', 'mult_div', 'money'], 'assessment numeracy starts')
  for (const st of NUMERACY_START) ok(num.UNITS.some((u) => u.start === st) && firstLessonOf(COURSES['basic-numeracy'], st), `numeracy start "${st}" has a first lesson`)
  eq(firstLessonOf(COURSES['basic-numeracy'], null).key, 'n-digit-0', 'unknown start -> first digit'); eq(firstLessonOf(COURSES['basic-numeracy'], 'money').key, 'n-naira', 'money start')

  // --- every answer, recomputed independently from the text on screen
  const solve = (expr) => {                                              // "₦500 − ₦350 = ?" -> 150 ; parses the displayed text, not the item
    const toks = expr.replace(/₦/g, '').replace(/ ?(kg|l|m)\b/g, '').replace(/ = \?$/, '').split(' ')
    let acc = Number(toks[0]); for (let i = 1; i < toks.length; i += 2) { const n = Number(toks[i + 1]); acc = toks[i] === '+' ? acc + n : toks[i] === '−' ? acc - n : toks[i] === '×' ? acc * n : acc / n }
    return acc
  }
  let items = 0, picks = 0, calcs = 0
  for (const l of num.LESSONS) {
    ok(l.steps[0].type === 'teach' && l.steps.at(-1).type === 'review', `${l.key}: teach first, review last`)
    ok(strings.ha[l.title.key] && strings.en[l.title.key], `title string ${l.title.key}`)
    for (const [v] of Object.entries(l.title.vars)) ok(strings.ha[l.title.key].includes('{' + v + '}'), `${l.title.key} uses {${v}}`)
    for (const st of l.steps) {
      if (st.type === 'teach' && st.kind === 'concept') { ok(strings.ha[st.conceptKey] && strings.en[st.conceptKey], 'concept string ' + st.conceptKey) }
      const check = (item, where) => {
        items++
        const f = num.formatItem(item), expect = solve(f.expr)
        ok(Number.isInteger(expect) && expect >= 0 && expect <= 9999, `${where}: ${f.expr} has a whole, positive, small answer (${expect})`)
        eq(f.answer, String(expect), `${where}: answer of ${f.expr}`)
        ok(f.full.includes('= ') && f.full.replace(/₦|kg|l$|m$|\s/g, '').endsWith(String(expect)) || f.full.includes(String(expect)), `${where}: reveal text shows the answer`)
        if (item.op === '÷') ok(item.nums.slice(1).reduce((a, n) => a * n, 1) !== 0 && item.nums[0] % item.nums[1] === 0, `${where}: division is exact`)
        if (item.textKey) { ok(strings.ha[item.textKey] && strings.en[item.textKey], 'question string ' + item.textKey); for (const v of Object.keys(item.vars)) ok(strings.ha[item.textKey].includes('{' + v + '}') && strings.en[item.textKey].includes('{' + v + '}'), `${item.textKey} uses {${v}}`) }
      }
      if (st.type === 'calc') { calcs++; check(st.item, l.key) }
      if (st.type === 'teach' && st.worked) check(st.worked, l.key + ' worked example')
      if (st.type === 'pick') {
        picks++
        ok(strings.ha[st.promptKey] && strings.en[st.promptKey], 'prompt string ' + st.promptKey)
        ok(st.options.includes(st.target) && new Set(st.options).size === st.options.length && st.options.length >= 2, `${l.key}: pick options`)
        const nums = st.options.map((o) => Number(o.replace('₦', '')))
        if (st.problem) { check(st.problem, l.key + ' pick'); eq(st.target, String(solve(num.formatItem(st.problem).expr)), `${l.key}: pick target is the answer`); ok(st.options.every((o) => /^\d+$/.test(o)), `${l.key}: options are whole numbers`) }
        if (st.promptKey === 'pickBigger' || st.promptKey === 'pickBiggest') eq(Number(st.target.replace('₦', '')), Math.max(...nums), `${l.key}: bigger target`)
        if (st.promptKey === 'pickSmaller') eq(Number(st.target.replace('₦', '')), Math.min(...nums), `${l.key}: smaller target`)
        if (st.promptKey === 'pickCount') eq(Number(st.target), st.dots, `${l.key}: count target equals dots`)
        if (st.promptKey === 'pickNumber') { eq(Number(st.target), st.vars.n, `${l.key}: number target`); ok(strings.ha.pickNumber.includes('{n}'), 'pickNumber uses {n}') }
      }
    }
    if (l.steps.some((x) => x.type === 'calc')) eq([l.steps.filter((x) => x.type === 'calc').length, l.steps.filter((x) => x.type === 'pick').length, !!l.steps[0].worked], [3, 1, true], `${l.key}: worked example, 3 written calculations, 1 multiple-choice`)
  }
  ok(items >= 120 && calcs >= 75 && picks >= 50, `numeracy content size (${items} items, ${calcs} written, ${picks} multiple choice)`)
  for (const u of num.UNITS) ok(strings.ha[u.titleKey] && strings.en[u.titleKey], 'unit title ' + u.id)
  eq(num.NUMBER_WORDS, ['sifili', 'ɗaya', 'biyu', 'uku', 'huɗu', 'biyar', 'shida', 'bakwai', 'takwas', 'tara', 'goma'], 'Hausa number words 0-10 as drafted (a native speaker must confirm; change this list with them)'); ok(new Set(num.NUMBER_WORDS).size === 11, 'number words unique')
  for (let n = 0; n <= 9; n++) { const l = num.LESSONS.find((x) => x.key === 'n-digit-' + n); eq(l.steps.map((x) => x.type), ['teach', 'show', 'trace', 'write', 'pick', 'review'], `digit ${n} lesson order`); eq(l.steps[0].word, num.NUMBER_WORDS[n], `digit ${n} word`) }
  eq(num.formatItem(num.LESSONS.find((l) => l.key === 'n-add-20').steps[0].worked).full, '10 + 5 = 15', 'the 10 + 5 example')
  eq(num.formatItem({ nums: [3, 200], op: '×', money: 'last' }).full, '3 × ₦200 = ₦600', 'money times'); eq(num.formatItem({ nums: [600, 3], op: '÷', money: 'first' }).full, '₦600 ÷ 3 = ₦200', 'money share')
  eq(num.formatItem({ nums: [4, 3], op: '×', unit: 'kg' }).full, '4 kg × 3 = 12 kg', 'unit times'); eq(num.formatItem({ nums: [2, 3], op: '+', unit: 'kg' }).expr, '2 kg + 3 kg = ?', 'unit plus')

  // --- aggregating one run
  const steps = new Array(7).fill({})
  eq(aggregateResults(steps, {}), { trace: null, write: null, match: null, find: null, steps: 6, traceTries: 0, calcYes: 0, calcHelp: 0, calcNo: 0, pickRight: 0, pickTotal: 0 }, 'nothing answered')
  const r1 = aggregateResults(steps, { 1: { type: 'calc', rating: 'yes' }, 2: { type: 'calc', rating: 'help' }, 3: { type: 'calc', rating: 'no' }, 4: { type: 'pick', ok: true }, 5: { type: 'pick', ok: false } })
  eq([r1.calcYes, r1.calcHelp, r1.calcNo, r1.pickRight, r1.pickTotal], [1, 1, 1, 1, 2], 'calc and pick counts')
  eq(aggregateResults(steps, { 1: { type: 'calc', rating: 'no' } }).calcNo, 1, 'one answer'); eq(aggregateResults(steps, { 1: { type: 'calc', rating: 'no' }, 1.5: undefined }).calcNo, 1, 'ignores junk keys')
  { const a = { 2: { type: 'calc', rating: 'no' } }; a[2] = { type: 'calc', rating: 'yes' }; const r = aggregateResults(steps, a); eq([r.calcYes, r.calcNo], [1, 0], 'answering a step again REPLACES the earlier answer (going Back cannot double count)') }
  eq(aggregateResults(steps, { 1: { type: 'write', rating: 'yes' }, 3: { type: 'write', rating: 'no' } }).write, 'no', 'weakest writing rating counts')
  eq(aggregateResults(steps, { 1: { type: 'trace', score: 0.5, tries: 2 }, 2: { type: 'trace', score: 0.9, tries: 1 } }).trace, 0.9, 'best trace'); eq(aggregateResults(steps, { 4: { type: 'match', ok: true }, 5: { type: 'find', ok: false } }).find, 'no', 'find no')
  ok(aggregateResults(steps, { 0: { type: 'calc', rating: 'yes' } }).calcYes === 1, 'step 0 counts')
  // --- what "needs practice" means for maths
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { calcYes: 1, calcHelp: 0, calcNo: 2 } }), 'mostly different handwritten answers -> practise')
  ok(!needsPractice({ best_trace: null, write_rating: null, last_results: { calcYes: 3, calcHelp: 0, calcNo: 0, pickRight: 1, pickTotal: 1 } }), 'all same -> fine')
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { calcYes: 3, calcHelp: 0, calcNo: 0, pickRight: 0, pickTotal: 1 } }), 'wrong multiple-choice answer -> practise')
  ok(!needsPractice({ best_trace: null, write_rating: null, last_results: { calcYes: 2, calcHelp: 1, calcNo: 0 } }), 'two same and one unsure is fine (2.5 of 3)')
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { calcYes: 1, calcHelp: 1, calcNo: 1 } }), 'one of each -> practise (1.5 of 3)')
}


// ---------- PHASE 6: photos, saved handwriting, assignments, teacher review ----------
{
  // --- photo checks
  eq(validatePhoto({ type: 'image/jpeg', size: 3e6 }), null, 'jpeg ok'); eq(validatePhoto({ type: 'image/PNG', size: 100 }), null, 'png (any case) ok'); eq(validatePhoto({ type: 'image/webp', size: 100 }), null, 'webp ok')
  for (const type of ['image/heic', 'image/gif', 'application/pdf', 'video/mp4', 'text/html', '', undefined]) eq(validatePhoto({ type, size: 100 }), 'PHOTO_TYPE', 'rejects type ' + type)
  eq(validatePhoto(null), 'PHOTO_TYPE', 'no file'); eq(validatePhoto({ type: 'image/jpeg', size: 0 }), 'PHOTO_EMPTY', 'empty file'); eq(MAX_INPUT_BYTES, 15 * 1024 * 1024, 'phones may hand us up to 15 MB before shrinking'); eq(validatePhoto({ type: 'image/jpeg', size: MAX_INPUT_BYTES + 1 }), 'PHOTO_BIG', 'too large'); eq(validatePhoto({ type: 'image/jpeg', size: MAX_INPUT_BYTES }), null, 'limit itself ok')
  ok(TARGET_BYTES < MAX_OUTPUT_BYTES && MAX_OUTPUT_BYTES === 1572864, 'we aim well below the bucket limit')
  eq(fitSize(4000, 3000, 1280), { width: 1280, height: 960 }, 'shrinks, keeps shape'); eq(fitSize(3000, 4000, 1280), { width: 960, height: 1280 }, 'portrait'); eq(fitSize(800, 600, 1280), { width: 800, height: 600 }, 'never enlarges'); eq(fitSize(0, 10, 100), { width: 0, height: 0 }, 'bad size')
  ok(photoSettings(true).max < photoSettings(false).max && photoSettings(true).quality < photoSettings(false).quality, 'low-data mode sends smaller pictures')
  eq(qualitySteps(0.72), [0.72, 0.62, 0.52, 0.4], 'quality steps'); ok(qualitySteps(0.5).every((q) => q >= 0.4) && new Set(qualitySteps(0.45)).size === qualitySteps(0.45).length, 'quality never below 0.4, no repeats')
  const uid = '123e4567-e89b-42d3-a456-426614174000', cid = '9b2d8a10-3c4e-4f5a-8b6c-7d8e9f0a1b2c'
  ok(photoPathOk(uid, photoPath(uid, cid)), 'our path passes the same shape check as the database'); ok(!photoPathOk(uid, `${cid}/${cid}.jpg`) && !photoPathOk(uid, `${uid}/../x.jpg`) && !photoPathOk(uid, `${uid}/${cid}.gif`) && !photoPathOk(uid, `${uid}/a/${cid}.jpg`), 'other folders and tricks fail')

  // --- stroke packing
  const dense = { tool: 'pen', w: 0.012, pts: Array.from({ length: 1000 }, (_, i) => [0.1 + i * 0.0001, 0.5]) }
  const packed = simplifyStrokes([dense, { tool: 'eraser', w: 0.04, pts: [[0.5, 0.5], [0.6, 0.6]] }, { tool: 'pen', w: 0.012, pts: [] }, { tool: 'pen', w: 0.012, pts: [[NaN, 1], [0.2, 0.2]] }])
  eq(packed.length, 2, 'eraser and empty strokes dropped'); ok(packed[0].pts.length < 100, `dense line is thinned (${packed[0].pts.length} points)`)
  eq(packed[0].pts[0], [0.1, 0.5], 'first point kept'); ok(Math.abs(packed[0].pts.at(-1)[0] - (0.1 + 999 * 0.0001)) < 1e-3, 'last point kept'); eq(packed[1].pts, [[0.2, 0.2]], 'bad points dropped')
  eq(simplifyStrokes([{ tool: 'highlight', w: 0.03, pts: [[0, 0], [1, 1]] }]).length, 0, 'highlight dropped for learners'); eq(simplifyStrokes([{ tool: 'highlight', w: 0.03, pts: [[0, 0], [1, 1]] }], { keep: ['pen', 'highlight'] }).length, 1, 'highlight kept for teachers')
  eq(simplifyStrokes([{ tool: 'pen', w: 0.01, pts: Array.from({ length: 5000 }, (_, i) => [(i % 100) / 100, Math.floor(i / 100) / 50]) }], { minDist: 0 })[0].pts.length, 1500, 'point cap'); eq(simplifyStrokes(null), [], 'null strokes')
  ok(JSON.stringify(simplifyStrokes([dense])).length < 5000, 'a long line packs to a few KB')

  // --- what the learner sees
  const open = { status: 'open' }, closed = { status: 'closed' }
  eq([workState(open, undefined), workState(closed, undefined), workState(open, { status: 'submitted' }), workState(open, { status: 'reviewed' }), workState(open, { status: 'redo' })], ['notSent', 'closed', 'sent', 'marked', 'redo'], 'assignment states')
  ok(Object.keys(STATE_KEY).every((k) => strings.ha[STATE_KEY[k]] && strings.en[STATE_KEY[k]]), 'every state has text')
  eq([canSend(open, undefined), canSend(open, { status: 'submitted' }), canSend(open, { status: 'redo' }), canSend(open, { status: 'reviewed' }), canSend(closed, undefined)], [true, true, true, false, false], 'who may send (same rule as the database)')

  // --- the database (021)
  const sql21 = readFileSync('supabase/migrations/021_adult_work.sql', 'utf8')
  const code21 = sql21.replace(/--.*$/gm, '')
  ok(/unique \(learner_id, assignment_id, attempt_no\)/.test(sql21) && /unique \(learner_id, client_uuid\)/.test(sql21), 'one row per attempt; a retried upload is stored once')
  ok(/check \(\(kind = 'handwriting' and strokes is not null and file_path is null\) or \(kind = 'photo' and file_path is not null and strokes is null\)\)/.test(sql21), 'a submission is either handwriting or a photo, never both or neither')
  ok(/attempt_no between 1 and 5/.test(sql21) && /latest\.attempt_no >= 5 then/.test(sql21), 'at most 5 attempts')
  ok(/latest\.status = 'reviewed' then raise exception 'already marked'/.test(sql21), 'marked work cannot be replaced unless the teacher asks for another attempt')
  ok(sql21.indexOf('client_uuid = p_client') < sql21.indexOf("a.status <> 'open'"), 'a retry of an upload that already arrived succeeds even if the assignment closed meanwhile')
  ok(/not exists \(select 1 from storage\.objects o where o\.bucket_id = 'adult-submissions' and o\.name = p_file\)/.test(sql21), 'a photo submission needs the file to exist in storage')
  ok(sql21.includes("'/[0-9a-f-]{36}\\.(jpg|png|webp)$'") && /'\^' \|\| auth\.uid\(\)::text/.test(sql21), "a learner can only reference a file in their own folder (same shape as photoPathOk)")
  ok(/values \('adult-submissions', 'adult-submissions', false, 1572864, array\['image\/jpeg','image\/png','image\/webp'\]\)/.test(sql21) && MAX_OUTPUT_BYTES === 1572864 && ALLOWED_TYPES.join() === 'image/jpeg,image/png,image/webp', 'bucket is private, same size limit and types as the app')
  ok(/for insert to authenticated[\s\S]*is_adult_learner\(\) and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/.test(sql21), 'learners upload only into their own folder')
  ok(/for select to authenticated[\s\S]*adult_staff_can_see_file\(name\)/.test(sql21) && /for delete to authenticated/.test(sql21) && !/for update to authenticated/.test(sql21), 'photos readable by owner or the class staff; owner may delete; nobody may overwrite')
  ok(/create policy "adult_submissions: own or class staff"[\s\S]*adult_can_manage_assignment\(assignment_id\)/.test(sql21) && !/staff_can_see_learner/.test(code21), 'a facilitator sees work only for assignments of classes they manage (not merely any class of the learner)')
  ok(/adult_staff_can_see_file[\s\S]*adult_can_manage_assignment\(s\.assignment_id\)/.test(sql21), 'photo access follows the same rule')
  ok(/p_score > a\.max_score/.test(sql21) && /\(c->>'tool'\) not in \('pen','highlight'\)/.test(sql21) && /pg_column_size\(p_corrections\) > 300000/.test(sql21), 'feedback is validated (score range, tools, size)')
  ok(/status = 'superseded'/.test(sql21) && /raise exception 'older attempt'/.test(sql21), 'older attempts are kept but cannot be marked')
  ok(/revoke all on function public\.adult_expired_submissions\(\) from public, anon, authenticated/.test(sql21) && /revoke all on function public\.adult_purge_delete\(uuid\[\]\) from public, anon, authenticated/.test(sql21) && /grant execute on function public\.adult_expired_submissions\(\) to service_role/.test(sql21) && /grant execute on function public\.adult_purge_delete\(uuid\[\]\) to service_role/.test(sql21), 'retention functions are for the service role only (revoked from everyone else, granted to service_role)')
  eq((sql21.match(/closed_at < now\(\) - interval '2 months'/g) || []).length, 2, 'retention is 2 months after the class closed, in both the listing and the deletion'); ok(!/interval '[0-9]+ (day|week|hour)/.test(code21.replace(/interval '1 day'/g, '')), 'no other retention interval')
  ok(!/delete from storage\.objects/i.test(code21), 'files are never deleted by SQL (that can orphan them); the Edge Function uses the storage API')
  ok(/grant select on public\.adult_assignments, public\.adult_submissions, public\.adult_feedback to authenticated/.test(sql21), 'browser role can only read the three tables')
  // --- the purge function
  const purge = readFileSync('supabase/functions/adult-purge/index.ts', 'utf8')
  ok(/secret\.length < 24/.test(purge) && /safeEqual\(secret, given\)/.test(purge), 'purge needs a long shared secret, compared in constant time')
  ok(purge.indexOf(".storage.from('adult-submissions').remove") < purge.indexOf("rpc('adult_purge_delete'"), 'files are removed before database rows')
  ok(/if \(re\) return json\(\{ error: 'Could not remove files; nothing was deleted from the database'/.test(purge), 'if files cannot be removed the rows are kept')
  // --- the app side
  const work = readFileSync('src/adult/pages/Work.jsx', 'utf8')
  ok(/const client = useRef\(newId\(\)\)/.test(work) && (work.match(/useRef\(newId\(\)\)/g) || []).length === 2, 'each attempt has one id reused by every retry')
  ok(/uploadPhoto\(path, prepared\.blob\)/.test(work) && work.indexOf('uploadPhoto') < work.indexOf("kind: 'photo'"), 'photo is uploaded before it is submitted')
  ok(/prepared\.url/.test(work) && /photoPreview/.test(work) && /photoAnother/.test(work), 'preview and another attempt are offered')
  ok(/capture="environment"/.test(work) && /accept="image\/jpeg,image\/png,image\/webp"/.test(work), 'camera and gallery inputs')
  const api = readFileSync('src/adult/adultApi.js', 'utf8')
  ok(/upsert: false/.test(api) && /already exists\|duplicate\|409/.test(api), 'an upload that already arrived counts as success on retry')
  ok(/removeMyFiles[\s\S]*list\(uid/.test(api) && /removeMyFiles\(profile\.id\)/.test(readFileSync('src/adult/pages/Learner.jsx', 'utf8')), 'deleting an account removes the photos through the storage API first')
  ok(!/service_role|SERVICE_ROLE/.test(work + api), 'no service key in the app')
  const tw = readFileSync('src/adult/pages/TeachWork.jsx', 'utf8')
  ok(/keep: \['pen', 'highlight'\]/.test(tw) && /\.\.\.prior, \.\.\.marks/.test(tw), 'teacher marks (pencil and highlighter) are saved and earlier marks are kept')
  ok(/saved/.test(tw) && /askRedo/.test(tw) && /save\(true\)/.test(tw) && /save\(false\)/.test(tw), 'mark as reviewed or ask for another attempt')
}

console.log(fail ? `\n${fail} of ${n} checks FAILED` : `All ${n} adult checks passed`)
process.exit(fail ? 1 : 0)
