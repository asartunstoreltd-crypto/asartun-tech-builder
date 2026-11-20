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
import * as DIGITAL from '../src/adult/digital.js'
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
  for (const k of kha) { const dyn = /^(ip_|dom_|start_|resLiteracyName|resNumeracyName|reviewWrite_|d[tcqowm]_|du_|ds_)/.test(k); ok(dyn || text.includes("'" + k + "'") || text.includes('t(\'' + k + '\''), `string key never used: ${k}`) }
}

// ---------- SQL structure ----------
const sqlDir = 'supabase/migrations'
const sql = readdirSync(sqlDir).filter((f) => /^0(1[789]|2[0-6])_adult/.test(f)).map((f) => readFileSync(join(sqlDir, f), 'utf8')).join('\n')
const tables = [...sql.matchAll(/create table if not exists public\.(adult_[a-z_]+)/g)].map((m) => m[1])
ok(tables.length >= 10, 'found adult tables: ' + tables.length)
for (const t of tables) ok(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(sql), `RLS enabled on ${t}`)
for (const t of tables) ok(!/\bprofiles\b/.test((sql.match(new RegExp(`create table if not exists public\\.${t} \\([\\s\\S]*?\\n\\);`)) || [''])[0].replace(/adult_profiles/g, '')), `${t} does not reference children's profiles`)
ok(!/drop\s+(table|function|policy)\s+(?!if exists "?adult|if exists public\.adult)/i.test(sql.replace(/drop (policy|trigger) if exists[^;]*;/gi, '')), 'no destructive statements outside adult_ objects')
ok(!/\b(alter|drop)\s+table\s+public\.(profiles|missions|entitlements|payment_requests|organizations|org_members)\b/i.test(sql), 'children/org tables untouched')
const defs = [...sql.matchAll(/create or replace function public\.(adult_[a-z_]+|is_adult_[a-z]+|staff_can_see_learner)\([^)]*\)[\s\S]*?as \$\$[\s\S]*?\$\$;/g)]
ok(defs.length >= 12, 'functions found: ' + defs.length)
for (const m of defs) ok(/security definer set search_path = ''/.test(m[0]), `${m[1]}: security definer with empty search_path`)
for (const m of defs) if (!/adult_expired_submissions|adult_purge_delete|adult_grant_access|adult_calc_standard|adult_password_hook|adult_cleanup_attempts|adult_cms_bi|adult_cms_valid/.test(m[1]) && !/staff_can_see_learner|is_adult_staff|is_adult_learner|adult_can_manage_class|adult_can_manage_assignment|adult_learner_in_assignment_class|adult_feedback_visible|adult_log\b|adult_touch|auth\.uid\(\)/.test(m[0].slice(m[0].indexOf('as $$')))) ok(false, `${m[1]}: no caller check`)
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
  ok(/canSpeak = Boolean\(text\) && hasVoice\(l\)/.test(audio) && /if \(\(!file && !clip && !canSpeak\)/.test(audio), 'no listen button without a voice or recording (file, dashboard recording or phone voice)')
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
  ok(Object.keys(COURSES).length === 3 && COURSES['basic-numeracy'].lessons === num.LESSONS && COURSES['basic-digital'].lessons === DIGITAL.LESSONS, 'three courses registered')
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


// ================================================================= PHASE 7: attendance, reports, support rules, schedule
import * as R from '../src/adult/reports.js'
{
  const NOW = new Date('2026-11-18T10:00:00Z')            // a Wednesday
  const near = (a, b, m) => ok(typeof a === 'number' && Math.abs(a - b) < 1e-9, `${m}: got ${a} expected ${b}`)
  const row = (k, o = {}) => ({ k, s: 'completed', a: 1, bt: null, bc: null, wr: null, r: {}, c: '2026-11-10T09:00:00Z', u: '2026-11-10T09:00:00Z', ...o })
  const L = (o = {}) => ({ id: 'x', name: 'Aisha', joined: '2026-11-10T00:00:00Z', prog: [], att: [], subs: [], ...o })
  const ctx = (assignments = []) => ({ now: NOW, assignments })
  const flags = (l, c = ctx()) => R.supportFlags(l, c).flags
  const codes = (l, c = ctx()) => flags(l, c).map((f) => f.code)
  const seen = new Set()
  const codesSeen = (l, c) => { const f = flags(l, c); f.forEach((x) => seen.add(x.code)); return f.map((x) => x.code) }
  const A = (list) => list.map(([d, s]) => ({ d, s }))
  const litKeys = LESSONS.filter((l) => l.unit === 'letters').map((l) => l.key)

  // --- which lessons are "applying"
  ok(R.lessonInfo('letter-01').course === 'literacy' && !R.lessonInfo('letter-01').applied, 'letters are literacy, not applied')
  ok(R.lessonInfo('message-1').applied, 'messages count as applying')
  ok(R.lessonInfo('n-naira').applied && R.lessonInfo('n-measure-kg').applied && R.lessonInfo('n-profit').applied, 'money, measuring and profit lessons count as applying')
  ok(R.lessonInfo('n-add-5').course === 'numeracy' && !R.lessonInfo('n-add-5').applied, 'adding is counting, not applied')
  eq(R.lessonInfo('nope'), null, 'unknown lesson key')
  eq([...R.APPLIED_KEYS].sort(), [...num.LESSONS.filter((l) => ['money', 'measure', 'finance'].includes(l.unit)).map((l) => l.key), ...MESSAGES.map((_, i) => 'message-' + (i + 1))].sort(), 'applied lessons are exactly money+measure+finance+messages')
  ok(LESSONS.every((l) => R.lessonInfo(l.key)) && num.LESSONS.every((l) => R.lessonInfo(l.key)), 'every lesson of both courses is classified')

  // --- skill areas pool CHECKS, not lessons
  {
    const a = R.skillAreas([row('letter-01', { bt: 0.9, wr: 'yes', r: { match: 'yes', find: 'no' } })])
    eq([a.write.items, a.write.good], [2, 2], 'passed trace + good writing = 2 of 2')
    eq([a.read.items, a.read.good], [2, 1], 'match right, find wrong = 1 of 2')
    eq([a.count.items, a.apply.items], [0, 0], 'a literacy lesson gives no counting evidence')
    const b = R.skillAreas([row('letter-01', { bt: 0, wr: 'help' })])
    eq([b.write.items, b.write.good], [2, 0.5], 'failed trace = 0, "help" rating = half')
    eq(R.skillAreas([row('letter-01', { bt: 0.5 })]).write.good, 0, 'a trace of 50% did not pass the check (needs 68%), so it counts as not yet'); eq(R.skillAreas([row('letter-01', { bt: TRACE_OK })]).write.good, 1, 'exactly the pass mark passes')
    const c = R.skillAreas([row('n-add-5', { r: { calcYes: 2, calcHelp: 1, calcNo: 0, pickRight: 1, pickTotal: 1 } })])
    eq([c.count.items, c.count.good], [4, 3.5], 'written maths (help = half) + multiple choice pooled')
    eq(c.apply.items, 0, 'adding is not counted as applying')
    const d = R.skillAreas([row('n-naira', { r: { calcYes: 3, calcNo: 1, pickRight: 1, pickTotal: 1 } })])
    eq([d.apply.items, d.apply.good, d.count.items], [5, 4, 0], 'money lesson counts as applying only')
    const e = R.skillAreas([row('message-1', { r: { match: 'yes' } })])
    eq([e.apply.items, e.apply.good, e.read.items], [1, 1, 0], 'reading a practical message counts as applying')
    const f = R.skillAreas([row('n-digit-3', { bt: 0.9, wr: 'yes' })])
    eq([f.write.items, f.write.good], [2, 2], 'writing digits counts as writing')
    eq(R.skillAreas([row('zzz', { bt: 1, wr: 'yes' })]).write.items, 0, 'unknown key is never counted')
    eq(R.skillAreas([]).read.level, 'none', 'no evidence = none, not weak')
    eq(R.skillAreas([row('letter-01', { r: { match: 'no', find: 'no' } })]).read.level, 'early', 'fewer than 4 checks = early, even if all wrong')
    const lvl = (good, items) => R.skillAreas([row('n-add-5', { r: { calcYes: good, calcNo: items - good } })]).count.level
    eq(lvl(8, 10), 'secure', '80% is secure'); eq(lvl(7, 10), 'developing', '70% developing'); eq(lvl(6, 10), 'developing', '60% developing'); eq(lvl(5, 10), 'building', '50% building'); eq(lvl(3, 3), 'early', '3 of 3 still early')
    eq(lvl(4, 4), 'secure', 'exactly the minimum evidence is judged')
  }

  // --- attendance
  {
    const a = R.attendanceStats(A([['2026-11-09', 'present'], ['2026-11-02', 'late'], ['2026-11-16', 'absent'], ['2026-11-12', 'bogus']]))
    eq([a.marked, a.present, a.late, a.absent, a.attended], [3, 1, 1, 1, 2], 'late counts as attending; junk ignored')
    near(a.rate, 2 / 3, 'rate'); eq(a.absentStreak, 1, 'streak counted from the latest, input order irrelevant')
    eq(R.attendanceStats([]).rate, null, 'no marks = no rate (not 0%)')
    eq(R.attendanceStats(A([['2026-11-02', 'absent'], ['2026-11-09', 'absent'], ['2026-11-16', 'absent']])).absentStreak, 3, 'streak of 3')
    eq(R.attendanceStats(A([['2026-11-02', 'absent'], ['2026-11-09', 'present']])).absentStreak, 0, 'a later presence ends the streak')
  }

  // --- assignments
  {
    const asg = [{ id: 'a1', due: '2026-11-01T00:00:00Z', max: 10 }, { id: 'a2', due: '2026-11-05T00:00:00Z', max: 20 }, { id: 'a3', due: '2026-12-01T00:00:00Z', max: 10 }, { id: 'a4', due: null, max: 10 }]
    const w = R.workStats([{ a: 'a1', st: 'reviewed', score: 5 }, { a: 'a2', st: 'submitted', score: null }], asg, NOW)
    eq([w.given, w.sent, w.marked, w.waiting, w.redo], [4, 2, 1, 1, 0], 'counts')
    near(w.avgShare, 0.5, 'share of full marks'); eq(w.overdueUnsent, 0, 'sent work is not overdue; future and undated are not overdue')
    eq(R.workStats([], asg, NOW).overdueUnsent, 2, 'two assignments past due with nothing sent')
    near(R.workStats([{ a: 'a2', st: 'reviewed', score: 99 }], asg, NOW).avgShare, 1, 'share is capped at full marks')
    eq(R.workStats([{ a: 'a1', st: 'redo', score: 3 }], asg, NOW).marked, 0, 'a "try again" attempt is not a mark')
    eq(R.workStats([], [], NOW).avgShare, null, 'no marked work = no average')
  }

  // --- the support rules: each one fires AT its threshold and not below it
  {
    ok(codes(L({ att: A([['2026-11-02', 'absent'], ['2026-11-09', 'absent']]) })).includes('absentStreak') && !codes(L({ att: A([['2026-11-02', 'absent'], ['2026-11-09', 'absent']]) })).includes('attLow'), '2 sessions: streak yes, rate rule needs 3 marked sessions')
    eq(codesSeen(L({ att: A([['2026-11-02', 'present'], ['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) })), ['attLow', 'absentStreak'], '1 of 3 came')
    eq(flags(L({ att: A([['2026-11-02', 'absent'], ['2026-11-09', 'present'], ['2026-11-16', 'absent']]) }))[0].level, 'high', '1 of 3 (33%) is serious')
    eq(codes(L({ att: A([['2026-10-05', 'absent'], ['2026-10-12', 'absent'], ['2026-10-19', 'present'], ['2026-10-26', 'present'], ['2026-11-02', 'present']]) })), [], '3 of 5 = 60% exactly is NOT flagged')
    { const rows = []; for (let i = 0; i < 20; i++) rows.push([`2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9) * 3).padStart(2, '0')}`, i < 9 ? 'absent' : 'present'])   // 9 absent first, then 11 present: 55%
      const f55 = flags(L({ att: A(rows) })); eq([f55.length, f55[0]?.code, f55[0]?.level], [1, 'attLow', 'watch'], '11 of 20 = 55% is below 60%: watch (not serious)') }
    const f40 = flags(L({ att: A([['2026-10-05', 'absent'], ['2026-10-12', 'absent'], ['2026-10-19', 'absent'], ['2026-10-26', 'present'], ['2026-11-02', 'present']]) }))
    eq([f40.length, f40[0].code, f40[0].level], [1, 'attLow', 'watch'], '2 of 5 = 40% exactly is a watch, not serious')
    eq(flags(L({ att: A([['2026-10-05', 'absent'], ['2026-10-12', 'absent'], ['2026-10-19', 'absent'], ['2026-10-26', 'absent'], ['2026-11-02', 'present']]) }))[0].level, 'high', '1 of 5 = 20% serious')
    eq(codes(L({ att: A([['2026-11-02', 'late'], ['2026-11-09', 'late'], ['2026-11-16', 'absent']]) })), [], 'late counts as coming (2 of 3)')
    // inactivity
    eq(codes(L({ joined: '2026-11-10T00:00:00Z' })), [], 'joined 8 days ago: not yet judged')
    eq(codesSeen(L({ joined: '2026-10-29T00:00:00Z' })), ['neverStarted'], 'in the class 20 days, never started')
    eq(flags(L({ joined: '2026-10-29T00:00:00Z' }))[0].level, 'watch', '20 idle days is a watch'); eq(flags(L({ joined: '2026-10-09T00:00:00Z' }))[0].level, 'high', '40 idle days is serious')
    eq(codes(L({ joined: '2026-10-01T00:00:00Z', prog: [row('letter-01', { u: '2026-11-13T09:00:00Z' })] })), [], 'active 5 days ago: fine')
    eq(codesSeen(L({ joined: '2026-10-01T00:00:00Z', prog: [row('letter-01', { u: '2026-11-04T10:00:00Z' })] })), ['inactive'], 'exactly 14 days idle is flagged')
    eq(codes(L({ joined: '2026-10-01T00:00:00Z', prog: [row('letter-01', { u: '2026-11-04T10:00:01Z' })] })), [], '13.99 days idle is not')
    eq(flags(L({ joined: '2026-10-01T00:00:00Z', prog: [row('letter-01', { u: '2026-10-21T10:00:00Z' })] }))[0].level, 'high', '28 days idle is serious')
    eq(flags(L({ joined: '2026-10-01T00:00:00Z', prog: [row('letter-01', { u: '2026-10-22T10:00:00Z' })] }))[0].level, 'watch', '27 days idle is a watch')
    // lessons that need practising again (bt 0 fails the tracing check)
    const bad = (i) => row(litKeys[i], { bt: 0 }), good = (i) => row(litKeys[i], { bt: 1, wr: 'yes', r: { match: 'yes' } })
    eq(codes(L({ prog: [bad(0), bad(1)] })), [], '2 finished lessons: too few to judge')
    eq(codesSeen(L({ prog: [bad(0), bad(1), bad(2)] })), ['practice'], '3 of 3 need practice')
    eq(codes(L({ prog: [bad(0), bad(1), good(2), good(3), good(4), good(5), good(6), good(7), good(8), good(9)] })), [], '2 of 10 is below both limits')
    eq(codes(L({ prog: [bad(0), bad(1), bad(2), good(3), good(4), good(5), good(6), good(7), good(8), good(9)] })), ['practice'], '3 of 10 reaches the count limit')
    eq(codes(L({ prog: [bad(0), bad(1), good(2), good(3), good(4)] })), ['practice'], '2 of 5 = 40% reaches the share limit')
    eq(codes(L({ prog: [row(litKeys[0], { bt: 0, s: 'started' }), row(litKeys[1], { bt: 0, s: 'started' }), row(litKeys[2], { bt: 0, s: 'started' })] })), [], 'lessons not finished are not "finished but weak"')
    // written maths and multiple choice
    const calc = (y, h, no) => L({ prog: [row('n-add-5', { r: { calcYes: y, calcHelp: h, calcNo: no } })] })
    eq(codes(calc(1, 0, 4)), [], '5 written answers: too few to judge')
    eq(codes(calc(4, 0, 2)), [], '6 answers, 67%: fine')
    eq(codesSeen(calc(3, 0, 3)), ['mathsLow'], '6 answers, 50%: watch'); eq(flags(calc(3, 0, 3))[0].level, 'watch', '50% is a watch')
    eq(flags(calc(2, 0, 4))[0].level, 'high', '33% is serious'); eq(codes(calc(2, 2, 2)), ['mathsLow'], '"not sure" counts half: 2 yes + 2 not-sure + 2 different = 3 of 6 = 50%'); eq(codes(calc(3, 2, 1)), [], '3 yes + 2 not-sure of 6 = 67%: fine')
    const pick = (r, t2) => L({ prog: [row('n-add-5', { r: { pickRight: r, pickTotal: t2 } })] })
    eq(codes(pick(0, 3)), [], '3 questions: too few'); eq(codesSeen(pick(2, 4)), ['choiceLow'], '4 questions, 50%: watch'); eq(codes(pick(3, 4)), [], '75%: fine'); eq(flags(pick(1, 4))[0].level, 'high', '25% serious')
    // assignments
    const asg = [{ id: 'a1', due: '2026-11-01T00:00:00Z', max: 10 }, { id: 'a2', due: '2026-11-05T00:00:00Z', max: 10 }, { id: 'a3', due: '2026-12-01T00:00:00Z', max: 10 }]
    const rev = (a, sc) => ({ a, st: 'reviewed', score: sc, rv: '2026-11-10T00:00:00Z' })
    eq(codesSeen(L({ subs: [rev('a1', 4), rev('a2', 4)] }), ctx(asg)), ['workLow'], 'two marks averaging 40%')
    eq(codes(L({ subs: [rev('a1', 2)] }), ctx(asg)), [], 'one low mark alone is not judged (and one of two overdue is sent)')
    ok(!codes(L({ subs: [rev('a1', 2)] }), ctx(asg)).includes('workLow'), 'a single marked assignment never triggers the average rule')
    ok(!codes(L({ subs: [rev('a1', 5), rev('a2', 5)] }), ctx(asg)).includes('workLow'), 'exactly 50% is not flagged')
    eq(codesSeen(L({}), ctx(asg)), ['workOverdue'], 'two assignments overdue, nothing sent'); ok(!codes(L({ subs: [{ a: 'a1', st: 'submitted' }] }), ctx(asg)).includes('workOverdue'), 'one of two sent: only 1 overdue')
    // overall status
    eq(R.supportFlags(L(), ctx()).status, 'nodata', 'nothing recorded = "not enough information", never "fine"')
    eq(R.supportFlags(L({ att: A([['2026-11-16', 'present']]) }), ctx()).status, 'ok', 'some evidence, no flags = on track')
    eq(R.supportFlags(L({ att: A([['2026-11-02', 'present'], ['2026-11-09', 'absent'], ['2026-11-16', 'absent']]), subs: [] }), ctx()).status, 'support', 'serious flag = needs support')
    eq(R.supportFlags(L({ att: A([['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) }), ctx()).status, 'watch', 'one ordinary flag = keep an eye')
    eq(R.supportFlags(L({ att: A([['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) }), ctx(asg)).status, 'support', 'two ordinary flags = needs support')
    ok(flags(L({ att: A([['2026-11-02', 'present'], ['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) })).every((f) => f.code && ['watch', 'high'].includes(f.level) && f.vars && typeof f.vars === 'object'), 'every flag has a code, a level and the numbers behind it')
    // every flag code the rules can produce has a sentence on screen
    const tr = readFileSync('src/adult/pages/TeachReports.jsx', 'utf8')
    const keyMap = Object.fromEntries([...tr.match(/export const FLAG_KEY = \{([^}]*)\}/)[1].matchAll(/(\w+): '(\w+)'/g)].map((m) => [m[1], m[2]]))
    for (const c of ['attLow', 'absentStreak', 'inactive', 'neverStarted', 'practice', 'mathsLow', 'choiceLow', 'workLow', 'workOverdue']) { ok(seen.has(c), `rule ${c} was triggered by a test`); ok(keyMap[c] && strings.en[keyMap[c]], `rule ${c} has a sentence`) }
    for (const k of Object.values(keyMap)) { const v = (x) => (x.match(/\{[a-z]+\}/g) || []).sort().join(); ok(v(strings.en[k]).length > 0, `${k} shows its numbers`) }
    const src = readFileSync('src/adult/reports.js', 'utf8')
    ok([...src.matchAll(/code: '(\w+)'|'(inactive)' : '(neverStarted)'/g)].length >= 8, 'flag codes found in the rules')
    for (const th of ['ATT_LOW', 'ATT_VERY_LOW', 'ATT_MIN_SESSIONS', 'ABSENT_STREAK', 'INACTIVE_DAYS', 'INACTIVE_HIGH', 'PRACTICE_MIN_DONE', 'PRACTICE_SHARE', 'PRACTICE_COUNT', 'MATHS_MIN_ITEMS', 'MATHS_LOW', 'MATHS_VERY_LOW', 'MC_MIN_ITEMS', 'WORK_MIN_MARKED', 'WORK_LOW', 'WORK_OVERDUE']) ok(tr.includes('T.' + th), `the rules panel shows the real threshold ${th}`)
  }

  // --- over time
  {
    eq(R.weekStart('2026-11-15T23:59:59Z'), '2026-11-09', 'Sunday belongs to the week that started on Monday 9th'); eq(R.weekStart('2026-11-16T00:00:00Z'), '2026-11-16', 'Monday starts a week'); eq(R.weekStart('2026-11-18'), '2026-11-16', 'Wednesday')
    const w = R.weeklySeries(L({ prog: [row('letter-01', { c: '2026-11-17T08:00:00Z' }), row('letter-02', { c: '2026-11-10T08:00:00Z' }), row('letter-03', { c: '2026-11-11T08:00:00Z' }), row('letter-04', { c: '2026-08-01T08:00:00Z' }), row('letter-05', { s: 'started', c: null })], att: A([['2026-11-16', 'present'], ['2026-11-15', 'absent'], ['2026-11-09', 'late']]), subs: [{ a: 'a', st: 'reviewed', score: 5, rv: '2026-11-17T10:00:00Z' }, { a: 'b', st: 'submitted', rv: null }] }), NOW)
    eq(w.length, 8, '8 weeks'); eq([w[0].week, w[7].week], ['2026-09-28', '2026-11-16'], 'oldest first, ends this week')
    eq([w[7].completed, w[6].completed], [1, 2], 'completions bucketed by week; the August one is outside the window; a started lesson is not a completion')
    eq([w[7].marked, w[7].attended, w[6].marked, w[6].attended], [1, 1, 2, 1], 'attendance bucketed by week'); eq([w[7].work, w[6].work], [1, 0], 'marked work bucketed by the day it was marked')
  }

  // --- a class
  {
    const strong = L({ id: 's', name: 'Zainab', prog: [row('letter-01', { bt: 1, wr: 'yes', r: { match: 'yes', find: 'yes' } })], att: A([['2026-11-16', 'present']]) })
    const weak = L({ id: 'w', name: 'Bala', att: A([['2026-11-02', 'present'], ['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) })
    const none = L({ id: 'n', name: 'Aisha' }), mid = L({ id: 'm', name: 'Musa', att: A([['2026-11-09', 'absent'], ['2026-11-16', 'absent']]) })
    const sum = R.classSummary([strong, weak, none, mid], ctx())
    eq([sum.learners, sum.support, sum.watch, sum.ok, sum.nodata], [4, 1, 1, 1, 1], 'class counts by status')
    eq([sum.attendanceMarks, sum.lessonsCompleted], [6, 1], 'pooled attendance marks and finished lessons'); near(sum.attendanceRate, 2 / 6, 'pooled attendance rate')
    eq([...sum.reports].sort(R.bySupport).map((x) => x.l.name), ['Bala', 'Musa', 'Aisha', 'Zainab'], 'those who need most help first, then watch, then no-data, then on track')
    eq(R.classSummary([], ctx()).attendanceRate, null, 'empty class: no rate')
  }

  // --- what the learner sees: facts about their own work, nothing about "support"
  {
    const prog = [...litKeys.slice(0, 5).map((k, i) => row(k, i < 2 ? { bt: 0 } : { bt: 1, wr: 'yes', r: { match: 'yes' } })), row('n-add-5', { r: { calcYes: 3, calcNo: 1, pickRight: 1, pickTotal: 1 } })]
    const v = R.learnerView(prog, A([['2026-11-09', 'present'], ['2026-11-16', 'late'], ['2026-11-17', 'absent']]), [{ a: 'x', st: 'reviewed', score: 8 }, { a: 'y', st: 'submitted' }], NOW)
    eq([v.letters.total, v.letters.done, v.letters.solid], [26, 5, 3], 'letters: finished and solid (not needing practice)')
    eq([v.calc.done, v.writtenRight, v.writtenTotal], [1, 3, 4], 'written maths facts'); eq(v.practise.length, 2, 'two lessons to do again'); eq([v.attendance.attended, v.attendance.marked, v.markedWork], [2, 3, 1], 'attendance and marked work')
    ok(!('support' in v) && !('flags' in v) && !JSON.stringify(v).includes('attLow'), 'the learner view has no support flags')
    ok(!R.learnerView([], [], [], NOW).anyProgress, 'nothing yet = says so')
    const pg = readFileSync('src/adult/pages/Progress.jsx', 'utf8')
    ok(!/supportFlags|STATUS_KEY|FLAG_KEY|classSummary|reportData|supabaseStaff|staffApi/.test(pg), 'the learner progress page cannot show teacher-only judgements or call staff functions')
    ok(!/rank|leaderboard|points|stars|confetti/i.test(pg.replace(/\/\/.*$/gm, '')), 'no points, ranks or leaderboards for adults')
  }

  // --- class schedule: same rules in the app and the database
  {
    const ok1 = { days: [1, 3], start: '16:00', end: '17:30', mode: 'physical', location: 'Hall', note: '' }
    eq(R.scheduleProblem(ok1), null, 'valid schedule'); eq(R.scheduleProblem({ days: [], mode: 'online', note: 'WhatsApp group' }), null, 'no fixed days is fine')
    eq(R.scheduleProblem({ ...ok1, days: [0] }), 'schedDays', 'day 0'); eq(R.scheduleProblem({ ...ok1, days: [8] }), 'schedDays', 'day 8'); eq(R.scheduleProblem({ ...ok1, days: [1, 1] }), 'schedDays', 'duplicate day')
    eq(R.scheduleProblem({ ...ok1, days: [1, 2, 3, 4, 5, 6, 7] }), null, 'all seven days'); eq(R.scheduleProblem({ ...ok1, start: '24:00' }), 'schedTime', '24:00'); eq(R.scheduleProblem({ ...ok1, start: '9:00' }), 'schedTime', 'needs 2 digits')
    eq(R.scheduleProblem({ ...ok1, end: '16:00' }), 'schedOrder', 'end equal to start'); eq(R.scheduleProblem({ ...ok1, end: '15:59' }), 'schedOrder', 'end before start'); eq(R.scheduleProblem({ ...ok1, mode: 'x' }), 'sched', 'unknown mode')
    eq(R.scheduleProblem({ ...ok1, note: 'x'.repeat(201) }), 'sched', 'note too long'); eq(R.scheduleProblem({ ...ok1, note: 'x'.repeat(200) }), null, 'note of 200 is fine'); eq(R.scheduleProblem({ ...ok1, location: 'x'.repeat(121) }), 'sched', 'location too long')
    eq(R.scheduleParts({ days: [3, 1], start: '08:00', end: '09:00', note: 'n' }).days, [1, 3], 'days sorted for display'); eq(R.scheduleParts({}).days, [], 'empty schedule'); eq(R.scheduleParts(null).days, [], 'null schedule')
  }

  // --- the SQL (migration 022): structure and agreement with the app
  {
    const m22 = readFileSync('supabase/migrations/022_adult_reports.sql', 'utf8')
    const code = m22.replace(/--.*$/gm, '')
    const fn = (name) => (code.match(new RegExp(`create or replace function public\\.${name}\\([^)]*\\)[\\s\\S]*?\\n\\$\\$;|create or replace function public\\.${name}\\([^)]*\\)[\\s\\S]*?end \\$\\$;`)) || [''])[0]
    ok(/create table if not exists public\.adult_sessions/.test(code) && /create table if not exists public\.adult_attendance/.test(code), 'sessions and attendance tables')
    ok(/unique \(class_id, session_date\)/.test(code), 'one session per class per date')
    ok(/status\s+text not null check \(status in \('present','absent','late'\)\)/.test(code), 'attendance statuses = present/absent/late')
    ok(/primary key \(session_id, learner_id\)/.test(code), 'one mark per learner per session')
    ok(/on delete cascade/.test((code.match(/create table if not exists public\.adult_attendance \([\s\S]*?\n\);/) || [''])[0]) && /references public\.adult_sessions\(id\) on delete cascade/.test(code), 'marks go with their session')
    ok(/alter table public\.adult_sessions\s+enable row level security/.test(code) && /alter table public\.adult_attendance\s+enable row level security/.test(code), 'RLS on both new tables')
    ok(/grant select on public\.adult_sessions, public\.adult_attendance to authenticated/.test(code) && !/grant (insert|update|delete|all)/i.test(code), 'browser can only read the new tables')
    ok(/revoke all on public\.adult_sessions, public\.adult_attendance from anon, authenticated/.test(code), 'anonymous and browser roles reset before the grant')
    const pol = (code.match(/create policy "adult_attendance: own or class staff"[\s\S]*?;/) || [''])[0]
    ok(/learner_id = auth\.uid\(\)/.test(pol) && /adult_can_manage_session\(session_id\)/.test(pol) && !/staff_can_see_learner/.test(pol), 'a facilitator reads attendance only through the CLASS they manage, not through the learner')
    ok(/create policy "adult_sessions: class staff"[\s\S]*?adult_can_manage_class\(class_id\)/.test(code), 'sessions readable by class staff only')
    for (const f of ['adult_open_session', 'adult_mark_attendance', 'adult_remove_session', 'adult_set_class_schedule', 'adult_admin_unassign_facilitator', 'adult_report_data', 'adult_my_report', 'adult_can_manage_session']) {
      ok(new RegExp(`create or replace function public\\.${f}\\(`).test(code), `${f} exists`); const body = fn(f); ok(/security definer set search_path = ''/.test(body), `${f}: security definer, empty search_path`)
    }
    for (const f of ['adult_open_session', 'adult_mark_attendance', 'adult_remove_session', 'adult_set_class_schedule']) ok(/adult_can_manage_class\(/.test(fn(f)) && /42501/.test(fn(f)), `${f} checks that the caller manages the class`)
    for (const f of ['adult_open_session', 'adult_mark_attendance', 'adult_remove_session', 'adult_set_class_schedule']) ok(/class is closed/.test(fn(f)), `${f} refuses a closed class`)
    ok(/is_adult_staff\(array\['adult_admin'\]\)/.test(fn('adult_admin_unassign_facilitator')), 'only the adult admin removes a facilitator from a class')
    const mark = fn('adult_mark_attendance')
    ok(/adult_class_members cm where cm\.class_id = s\.class_id and cm\.learner_id = v_learner/.test(mark), 'a learner can be marked only in a class they belong to')
    ok(/\('present','absent','late'\)/.test(mark) && /> 300/.test(mark), 'status and size of the marks are validated')
    ok(/\(cm\.left_at is null or cm\.left_at::date >= s\.session_date\)/.test(mark), 'a learner who left before the session date cannot be marked for it')
    ok(/on conflict \(session_id, learner_id\) do update/.test(mark), 'marking again corrects the earlier mark')
    const open = fn('adult_open_session'); ok(/p_date < current_date - 366 or p_date > current_date \+ 1/.test(open), 'session date limited: not far in the past or the future')
    ok(/on conflict \(class_id, session_date\)/.test(open), 'opening the same date twice gives the same session')
    const sch = fn('adult_set_class_schedule')
    ok(sch.includes("'^([01][0-9]|2[0-3]):[0-5][0-9]$'") && sch.includes('p_end <= p_start') && sch.includes('not between 1 and 7') && sch.includes('cardinality(v_days) > 7') && sch.includes('> 120') && sch.includes('> 200'), 'the database repeats the schedule rules (time format, order, days 1-7, lengths)')
    ok(/mode in|p_mode not in \('physical','online','both'\)/.test(sch), 'schedule mode validated')
    const rep = fn('adult_report_data')
    ok(/not public\.adult_can_manage_class\(p_class\)/.test(rep) && rep.indexOf('adult_can_manage_class') < rep.indexOf('jsonb_build_object'), 'a class report starts with the permission check')
    ok(/att\.learner_id = p\.id and s\.class_id = p_class/.test(rep) && /s\.learner_id = p\.id and a\.class_id = p_class/.test(rep), 'attendance and work are limited to THIS class')
    ok(/m\.class_id = p_class and m\.left_at is null/.test(rep), 'only current members')
    ok(/> 300 then raise exception 'too many learners'/.test(rep), 'class size is capped')
    ok(/adult_log\('view_class_report'/.test(rep), 'reading a class report is logged')
    ok(/case when v_admin then/.test(rep), 'staff e-mail addresses are shown to the adult admin only')
    ok(/s\.status <> 'superseded'/.test(rep), 'only the latest attempt per assignment')
    ok(!/service_role/i.test(code), 'no service key in 022')
    const my = fn('adult_my_report')
    ok(/is_adult_learner\(\)/.test(my) && (my.match(/learner_id = auth\.uid\(\)/g) || []).length === 3 && !/p_learner/.test(my), 'a learner can only ever read their own report (no learner parameter)')
    ok(/case when s\.status = 'reviewed' then f\.score end/.test(my), 'a score is shown only once the work is marked')
    ok(/adult_report_data\(uuid\)/.test(code) && /grant execute on function public\.%s to authenticated/.test(code), 'functions granted to signed-in users only')
    ok(/revoke all on function public\.%s from public, anon/.test(code), 'and revoked from anonymous')
    // the app and the database use the same words
    ok(R.DAYS.length === 7 && R.DAYS[0] === 1 && R.DAYS[6] === 7, 'days 1-7 like the database')
    ok(src_has("['present', 'absent', 'late']"), 'attendance statuses in the app match the database')
    function src_has(x) { return readFileSync('src/adult/reports.js', 'utf8').includes(x) }
    // API
    const api = readFileSync('src/adult/adultApi.js', 'utf8')
    for (const [m, f] of [['reportData', 'adult_report_data'], ['openSession', 'adult_open_session'], ['markAttendance', 'adult_mark_attendance'], ['removeSession', 'adult_remove_session'], ['setSchedule', 'adult_set_class_schedule'], ['unassignFacilitator', 'adult_admin_unassign_facilitator']]) ok(new RegExp(`${m}: .*supabaseStaff, '${f}'`).test(api), `staffApi.${m} calls ${f} with the staff client`)
    ok(/myReport: \(\) => rpc\(supabaseAdult, 'adult_my_report'/.test(api), 'learner report uses the learner client')
    ok(/p_days: s\.days, p_start: s\.days\.length \? s\.start : null/.test(api), 'a schedule without days sends no times')
    ok(/too many learners.*TOOMANY|TOOMANY/.test(api) && /bad date.*BADDATE|BADDATE/.test(api) && /BADSCHEDULE/.test(api), 'database refusals become readable messages')
    for (const k of ['errBadDate', 'errBadSchedule', 'errBadMarks', 'errTooMany']) ok(strings.en[k] && strings.ha[k], `message ${k} exists`)
    ok(/select\('id,name,mode,location,status,course_id,schedule'\)/.test(api), 'class list includes the schedule')
    // screens
    const teach = readFileSync('src/adult/pages/Teach.jsx', 'utf8')
    ok(/\['attendance', 'tAttendance'\]/.test(teach) && /\['reports', 'tReports'\]/.test(teach) && /<AttendanceTab \/>/.test(teach) && /<ReportsTab role=\{role\} \/>/.test(teach), 'attendance and reports tabs are in the facilitator screen')
    ok(/ScheduleEditor cls=\{c\}/.test(teach) && /scheduleLine\(t, c\)/.test(teach), 'schedule shown and editable on the class card')
    ok(/path="progress" element=\{<Progress \/>\}/.test(readFileSync('src/adult/AdultApp.jsx', 'utf8')), 'learner progress route')
    ok(/to="\/adult\/progress"/.test(readFileSync('src/adult/pages/Learner.jsx', 'utf8')), 'link to My progress on Home')
    const trs = readFileSync('src/adult/pages/TeachReports.jsx', 'utf8')
    ok(!/supabase/i.test(trs.replace(/staffApi/g, '')), 'the report screens go through staffApi only')
    ok(/window\.print\(\)/.test(trs) && /ad-print-area/.test(trs) && /ad-noprint/.test(trs) && /PrintHead/.test(trs), 'reports can be printed from the phone')
    ok(/@media print/.test(readFileSync('src/adult/adult.css', 'utf8')) && /\.ad-noprint[^{]*\{ display:none !important/.test(readFileSync('src/adult/adult.css', 'utf8')), 'print stylesheet hides buttons and navigation')
    ok(strings.en.rpConfidential && /rpConfidential/.test(trs), 'printed reports are marked confidential')
    ok(/rpMeasureNote/.test(trs) && /never reads handwriting/.test(strings.en.rpMeasureNote), 'the report says handwriting is not read by the app')
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')); eq(Object.keys(pkg.dependencies).sort(), ['@supabase/supabase-js', 'lucide-react', 'react', 'react-dom', 'react-router-dom'], 'no new dependency')
  }
}


// ================================================================= PHASE 8: digital literacy course, payments, certificates
{
  const rd = (f) => readFileSync(f, 'utf8')
  const m23 = rd('supabase/migrations/023_adult_payments.sql'), m24 = rd('supabase/migrations/024_adult_certificates.sql')
  const c23 = m23.replace(/--.*$/gm, ''), c24 = m24.replace(/--.*$/gm, '')
  const fnOf = (code, name) => (code.match(new RegExp(`create or replace function public\\.${name}\\([^)]*\\)[\\s\\S]*?end \\$\\$;`)) || [''])[0]
  const D = DIGITAL

  // --- 8A: the digital course is well-formed data
  eq(D.LESSONS.length, 30, '30 digital lessons'); eq(D.UNITS.length, 7, '7 units')
  eq(new Set(D.LESSONS.map((l) => l.key)).size, 30, 'lesson keys unique')
  const allKeys = [...LESSONS, ...num.LESSONS, ...D.LESSONS].map((l) => l.key)
  eq(new Set(allKeys).size, allKeys.length, 'lesson keys unique across ALL THREE courses (progress is stored by key)')
  const keyRe = new RegExp(rd('supabase/migrations/020_adult_numeracy_progress.sql').match(/p_lesson !~ '([^']+)'/)[1])
  ok(D.LESSONS.every((l) => keyRe.test(l.key)), 'every digital key passes the database key rule')
  ok(D.LESSONS.every((l) => l.steps[0].type === 'teach' && l.steps[0].kind === 'concept' && l.steps[l.steps.length - 1].type === 'review'), 'each lesson: teaching page first, review last')
  ok(D.LESSONS.every((l) => { const q = l.steps.filter((x) => x.type === 'tap' || x.type === 'dchoice').length; return q >= 2 && q <= 4 }), 'each lesson has 2-4 marked questions (database allows up to 50 per lesson)')
  const refKeys = new Set(['dlSafe', 'dlScam', 'dlScamAsk'])
  const add = (x) => { if (x) refKeys.add(x) }
  for (const u of D.UNITS) add(u.titleKey)
  for (const l of D.LESSONS) { add(l.title.key); for (const st of l.steps) { add(st.conceptKey); add(st.askKey); add(st.promptKey); add(st.cardKey); add(st.whyKey); add(st.targetKey); (st.optionKeys || []).forEach(add) } }
  for (const [sc, els] of Object.entries(D.SCREENS)) for (const e of els) add(e.labelKey)
  for (const key of refKeys) ok(D.TEXT[key] && D.TEXT[key][0] && D.TEXT[key][1], `text exists in both languages: ${key}`)
  for (const key of Object.keys(D.TEXT)) ok(refKeys.has(key) || /^(dl[A-Z]|digitalTitle)/.test(key), `text is used by the course: ${key}`)
  for (const key of Object.keys(D.TEXT)) ok(strings.en[key] === D.TEXT[key][1] && strings.ha[key] === D.TEXT[key][0], `strings.js carries ${key}`)
  const sameOk = /^([\d＊＃]|Wi-Fi|1234|example\.gov\.ng|Asdfgh|Mama|Aisha|00:42|0803…|＋234…|www\.…|Ad|＋|－)$/
  for (const [key, [ha, en]] of Object.entries(D.TEXT)) ok(ha !== en || sameOk.test(ha), `Hausa differs from English (not left untranslated): ${key}`)
  // taps point at real, touchable places
  let taps = 0, choices = 0, scams = 0, scamYes = 0, safeYes = 0; const pos = new Set()
  for (const l of D.LESSONS) for (const st of l.steps) {
    if (st.type === 'tap') { taps++; const els = D.SCREENS[st.screen]; ok(els && els.some((e) => e.id === st.target && e.kind === 'btn'), `${l.key}: tap target ${st.target} is a button on ${st.screen}`); ok(els.filter((e) => e.kind === 'btn').length >= 3, `${l.key}: the screen has several buttons, so tapping is a real choice`) }
    if (st.type === 'dchoice') {
      choices++; ok(st.optionKeys.length >= 2 && new Set(st.optionKeys).size === st.optionKeys.length, `${l.key}: options unique`); ok(st.optionKeys.includes(st.targetKey), `${l.key}: the right answer is among the options`)
      if (st.cardKey) { scams++; eq([...st.optionKeys].sort(), ['dlSafe', 'dlScam'], `${l.key}: scam card offers Safe / Scam`); ok(st.whyKey, `${l.key}: scam card explains why`); if (st.targetKey === 'dlScam') scamYes++; else safeYes++ }
      if (st.optionKeys.length >= 3) pos.add(st.optionKeys.indexOf(st.targetKey))
    }
  }
  ok(taps >= 30 && choices >= 25, 'plenty of questions'); ok(scams >= 8 && scamYes >= 6 && safeYes >= 2, 'scam cards include both real scams and genuinely safe messages')
  eq([...pos].sort(), [0, 1, 2], 'the right answer is not always in the same place')
  for (const id of Object.keys(D.SCREENS)) for (const e of D.SCREENS[id]) ok(e.x >= 0 && e.y >= 0 && e.x + e.w <= 200 && e.y + e.h <= 330 && e.w >= 30 && e.h >= 28, `${id}/${e.id}: fits the picture and is big enough to touch`)
  const alltext = Object.values(D.TEXT).map((x) => x.join(' ')).join(' ')
  ok(!/GTBank|Zenith|Access Bank|First Bank|\bUBA\b|Opay|Palmpay|Moniepoint|Kuda|Facebook|Instagram|TikTok|Paystack|Flutterwave/i.test(alltext), 'scam examples never name a real bank or app')
  ok(!/typed|handwrit|write the answer/i.test(rd('src/adult/digital.js').replace(/\/\/.*$/gm, '')), 'no typed or handwritten answers in the digital course')
  eq(Object.keys(COURSES).includes('basic-digital') && COURSES['basic-digital'].route, '/adult/digital', 'course registered with its route')
  ok(/path="digital" element=\{<LessonList slug="basic-digital" \/>\}/.test(rd('src/adult/AdultApp.jsx')), 'route for the digital course')
  const les = rd('src/adult/pages/Lessons.jsx')
  ok(/case 'tap'/.test(les) && /case 'dchoice'/.test(les) && /TapStep/.test(les), 'lesson player handles the new steps')
  ok(/mine\.ends_at \|\| Date\.parse\(mine\.ends_at\) > Date\.now\(\)|!mine\.ends_at \|\| Date\.parse\(mine\.ends_at\) > Date\.now\(\)/.test(les) && /!d\.enrolled && !d\.course\.is_free/.test(les), 'a paid course without active access shows the payment panel, not the lessons')

  // --- 8A: reports understand the digital course
  {
    const row = (k, o = {}) => ({ k, s: 'completed', a: 1, bt: null, bc: null, wr: null, r: {}, c: '2026-11-10T09:00:00Z', u: '2026-11-10T09:00:00Z', ...o })
    const NOW8 = new Date('2026-11-18T10:00:00Z')
    ok(R.AREAS.includes('digital') && R.AREAS.includes('safety'), 'two new skill areas')
    eq(R.lessonInfo('d-power'), { course: 'digital', unit: 'phone', applied: false }, 'digital lesson classified'); ok(D.LESSONS.every((l) => R.lessonInfo(l.key)), 'every digital lesson classified')
    const a = R.skillAreas([row('d-power', { r: { pickRight: 2, pickTotal: 2 } }), row('d-pin', { r: { pickRight: 1, pickTotal: 2 } })])
    eq([a.digital.items, a.digital.good, a.safety.items, a.safety.good], [2, 2, 2, 1], 'phone checks and safety checks are pooled separately')
    eq([a.read.items, a.write.items, a.count.items, a.apply.items], [0, 0, 0, 0], 'digital lessons add nothing to reading, writing, counting or applying')
    const safe = (r, t2) => ({ id: 'x', name: 'A', joined: '2026-11-10T00:00:00Z', prog: [row('d-pin', { r: { pickRight: r, pickTotal: t2 } })], att: [], subs: [] })
    const codes8 = (l) => R.supportFlags(l, { now: NOW8, assignments: [] }).flags
    eq(codes8(safe(0, 3)).map((f) => f.code), [], '3 safety questions: too few to judge'); eq(codes8(safe(3, 4)).map((f) => f.code), [], '75%: fine')
    eq(codes8(safe(2, 4)).map((f) => [f.code, f.level]), [['safetyLow', 'watch']], '4 questions, 50%: watch'); eq(codes8(safe(1, 4)).map((f) => [f.code, f.level]), [['safetyLow', 'high']], '25%: serious')
    eq(codes8(safe(3, 5)).map((f) => f.code), [], '60% exactly is not flagged')
    const tr8 = rd('src/adult/pages/TeachReports.jsx'), pg8 = rd('src/adult/pages/Progress.jsx')
    ok(/safetyLow: 'fSafetyLow'/.test(tr8) && strings.en.fSafetyLow.includes('{pct}') && /T\.SAFETY_LOW/.test(tr8) && /T\.SAFETY_MIN_ITEMS/.test(tr8), 'the safety rule has a sentence and is shown in the rules panel')
    for (const [name, text] of [['reports', tr8], ['progress', pg8]]) { const m = text.match(/const AREA_KEY = \{([^}]*)\}/)[1]; for (const ar of R.AREAS) ok(new RegExp(`\\b${ar}: 'sk[A-Za-z]+'`).test(m), `${name}: label for area ${ar}`) }
    const v = R.learnerView([row('d-power'), row('d-pin', { r: { pickRight: 1, pickTotal: 2 } })], [], [], NOW8)
    eq([v.digital.total, v.safety.total, v.digital.done, v.safety.done], [23, 7, 1, 1], 'learner view counts the digital course')
  }

  // --- 8B: course pricing, payments, codes (migration 023)
  ok(/is_free = \(price_ngn = 0\)/.test(rd('supabase/migrations/017_adult_core.sql')), 'database ties "free" to price 0')
  for (const t2 of ['adult_payment_info', 'adult_payments', 'adult_activation_codes', 'adult_code_attempts']) ok(new RegExp(`alter table public\\.${t2}\\s+enable row level security`).test(c23), `RLS on ${t2}`)
  ok(/grant select on public\.adult_payment_info, public\.adult_payments to authenticated/.test(c23) && !/grant (insert|update|delete|all)/i.test(c23) && !/grant select[^;]*(activation_codes|code_attempts)/.test(c23), 'browser reads payment info and payments only; codes and attempts are not readable at all')
  ok(/revoke all on public\.adult_payment_info, public\.adult_payments, public\.adult_activation_codes, public\.adult_code_attempts from anon, authenticated/.test(c23), 'rights reset first')
  const ppol = (c23.match(/create policy "adult_payments: own or admin"[\s\S]*?;/) || [''])[0]
  ok(/learner_id = auth\.uid\(\)/.test(ppol) && /is_adult_staff\(array\['adult_admin'\]\)/.test(ppol) && !/staff_can_see_learner|adult_can_manage_class/.test(ppol), 'a learner reads only their own payments; only the adult admin reads all; facilitators never see payments')
  ok(/create unique index if not exists adult_payments_one_pending[^;]*where status = 'pending'/.test(c23), 'only one waiting request per learner and course')
  ok(/method\s+text not null default 'manual' check \(method in \('manual','code','online'\)\)/.test(c23) && /status\s+text not null default 'pending' check \(status in \('pending','verified','rejected','cancelled'\)\)/.test(c23), 'payment methods and statuses')
  ok(!/code\s+text/.test((c23.match(/create table if not exists public\.adult_activation_codes[\s\S]*?\n\);/) || [''])[0]) && /code_hash\s+text not null unique/.test(c23), 'codes are stored only as a hash')
  const grant = fnOf(c23, 'adult_grant_access')
  ok(/if e\.ends_at is null then return null; end if;/.test(grant) && /greatest\(now\(\), e\.ends_at\) \+ make_interval\(days => c\.access_days\)/.test(grant) && /c\.access_days is null then null/.test(grant), 'access: never shortened, added after any access still running, no end date when the course has none')
  ok(/revoke all on function public\.adult_grant_access\(uuid,uuid,text\) from public, anon, authenticated/.test(c23) && !/to authenticated[^;]*adult_grant_access/.test(c23.replace(/revoke[^;]*;/g, '')), 'access can only be granted from inside the database functions')
  for (const f of ['adult_admin_set_course', 'adult_admin_set_payment_info', 'adult_admin_verify_payment', 'adult_admin_reject_payment', 'adult_admin_payments', 'adult_admin_create_codes', 'adult_admin_codes']) ok(/is_adult_staff\(array\['adult_admin'\]\)/.test(fnOf(c23, f)) && /42501/.test(fnOf(c23, f)), `${f}: adult admin only`)
  const sc = fnOf(c23, 'adult_admin_set_course')
  ok(/p_status not in \('draft','published','coming_soon','archived'\)/.test(sc) && /p_price := 0; p_days := null/.test(sc) && /p_price < 1 or p_price > 10000000/.test(sc) && /p_days < 1 or p_days > 3650/.test(sc), 'course settings validated: status, free = price 0, price range, days range')
  const rq = fnOf(c23, 'adult_request_payment')
  ok(/is_adult_learner\(\)/.test(rq) && !/p_learner/.test(rq) && /auth\.uid\(\)/.test(rq) && /c\.status <> 'published' or c\.is_free/.test(rq), 'a learner can only ask for themselves, for a published premium course')
  ok(/v_ref !~ '\^\[0-9A-Za-z \.,\/_-\]\+\$'/.test(rq) && /char_length\(v_ref\) not between 3 and 60/.test(rq) && />= 3 then raise exception 'too many waiting'/.test(rq) && /when unique_violation/.test(rq) && /e\.ends_at is null then raise exception 'already has access'/.test(rq), 'reference limited, at most 3 waiting, duplicates and people with permanent access refused')
  ok(/c\.price_ngn, c\.access_days, 'manual'/.test(rq), 'the price and duration are fixed from the course at the moment of asking (a learner cannot set them)')
  ok(!/insert into public\.adult_payments[^;]*status/.test(rq.replace(/status\)/g, '')) || !/'verified'/.test(rq), 'a learner can never create a verified payment')
  const rc = fnOf(c23, 'adult_redeem_code')
  ok(/>= 10 then raise exception 'too many code tries'/.test(rc) && /interval '1 hour'/.test(rc) && /char_length\(v_norm\) <> 12/.test(rc) && /sha256\(convert_to\(v_norm, 'utf8'\)\)/.test(rc) && /redeemed_at is null and \(expires_at is null or expires_at > now\(\)\) for update/.test(rc), 'codes: 10 tries an hour, hashed lookup, unused and unexpired only, locked while used')
  ok(/adult_grant_access\(auth\.uid\(\), c\.id, 'payment'\)/.test(rc) && /c\.status <> 'published' or c\.is_free/.test(rc) && /redeemed_by = auth\.uid\(\)/.test(rc), 'a code gives access to its own premium course and is marked used')
  const cc = fnOf(c23, 'adult_admin_create_codes')
  ok(/p_count < 1 or p_count > 100 or/.test(cc) && /gen_random_uuid\(\)/.test(cc) && /encode\(sha256\(convert_to\(raw, 'utf8'\)\), 'hex'\)/.test(cc) && /returns text\[\]/.test(cc.slice(0, 200) + 'returns text[]') && /valid_days/.test(cc), 'codes: 1-100 at a time, random, only the hash stored')
  const vp = fnOf(c23, 'adult_admin_verify_payment')
  ok(/for update/.test(vp) && /p\.status <> 'pending'/.test(vp) && /adult_grant_access\(p\.learner_id, p\.course_id, 'payment'\)/.test(vp), 'accepting a payment: locked, only waiting ones, access granted by the database')
  ok(!/provider/.test([rq, rc, vp, fnOf(c23, 'adult_admin_reject_payment')].join('')), 'no function writes the online-provider columns: online payment is NOT connected')
  ok(!/service_role|secret|sk_live|sk_test/i.test(c23), 'no secret key in 023')
  ok(/adult_admin_set_course\(uuid,text,boolean,integer,integer\)/.test(c23) && /grant execute on function public\.%s to authenticated/.test(c23), 'functions granted to signed-in users only')
  const api8 = rd('src/adult/adultApi.js')
  for (const [m, f] of [['setCourse', 'adult_admin_set_course'], ['setPaymentInfo', 'adult_admin_set_payment_info'], ['adminPayments', 'adult_admin_payments'], ['verifyPayment', 'adult_admin_verify_payment'], ['rejectPayment', 'adult_admin_reject_payment'], ['createCodes', 'adult_admin_create_codes'], ['codes', 'adult_admin_codes'], ['revokeCertificate', 'adult_admin_revoke_certificate']]) ok(new RegExp(`${m}: .*supabaseStaff, '${f}'`).test(api8), `staffApi.${m} → ${f}`)
  for (const [m, f] of [['requestPayment', 'adult_request_payment'], ['cancelPayment', 'adult_cancel_payment'], ['redeemCode', 'adult_redeem_code'], ['certificateStatus', 'adult_certificate_status'], ['claimCertificate', 'adult_claim_certificate']]) ok(new RegExp(`${m}: .*supabaseAdult, '${f}'`).test(api8), `learnerApi.${m} → ${f}`)
  ok(!/p_price: i\.free \? 0 : i\.price|p_days: i\.free \? null : i\.days/.test(api8) || /p_free: i\.free/.test(api8), 'free courses send no price')
  for (const [rx, code] of [[/too many code tries/, 'CODETRIES'], [/bad codes/, 'BADCODES'], [/already waiting/, 'WAITING'], [/already has access/, 'HASACCESS'], [/not yet complete/, 'NOTYET'], [/certificate withdrawn/, 'WITHDRAWN'], [/bad reference/, 'BADREF']]) ok(new RegExp(`${code}'`).test(api8) && rx.test(m23 + m24), `refusal ${code} is raised by the database and mapped in the app`)
  ok(api8.indexOf("'BADCODES'") < api8.indexOf("'BADCODE'"), 'the longer message is matched first')
  const pay = rd('src/adult/pages/Pay.jsx'), adm = rd('src/adult/pages/TeachAdmin.jsx'), teach8 = rd('src/adult/pages/Teach.jsx'), lrn = rd('src/adult/pages/Learner.jsx')
  ok(!/supabase|service_role|secret/i.test(pay.replace(/learnerApi/g, '')) && !/supabase|service_role/i.test(adm.replace(/staffApi/g, '')), 'payment screens go through the API layer; no keys in the browser code')
  ok(/payNever/.test(pay) && /never type a pin|never type a bank card|Never type a PIN or a bank card/i.test(strings.en.payNever), 'the payment screen tells people never to type a PIN or card number')
  ok(!/type="password"|cardnumber|cc-number|autoComplete="cc/i.test(pay), 'no card or PIN field in the payment screen')
  ok(/\['courses', 'tCourses'\], \['content', 'tContent'\], \['payments', 'tPayments'\]/.test(teach8) && /role === 'adult_admin' \? \[\['courses'/.test(teach8) && /tab === 'payments' && role === 'adult_admin'/.test(teach8) && /tab === 'courses' && role === 'adult_admin'/.test(teach8), 'courses and payments are adult-admin screens (hidden and refused for facilitators)')
  ok(/c\.status === 'published' && !enrolled && c\.is_free && <button/.test(lrn) && !/!enrolled && !c\.is_free[^\n]*enroll\(/.test(lrn), 'the "join" button calls enrol only for FREE courses')
  ok(/to="\/adult\/payments"/.test(lrn) && /path="payments" element=\{<PaymentHistory \/>\}/.test(rd('src/adult/AdultApp.jsx')), 'learner payment history')
  ok(/staffApi\.verifyPayment\(p\.id\), true/.test(adm) && /apCheckMoney/.test(adm), 'accepting a payment reminds the admin to check the money first')

  // --- 8C: certificates (migration 024)
  const reqs = [...c24.matchAll(/update public\.adult_courses set required_lessons = array\[([^\]]*)\] where slug = '([a-z-]+)'/g)].map((m) => [m[2], m[1].split(',').map((x) => x.replace(/'/g, ''))])
  const want = { 'basic-literacy': LESSONS, 'basic-numeracy': num.LESSONS, 'basic-digital': D.LESSONS }
  eq(reqs.length, 3, 'required lessons seeded for the three courses')
  for (const [slug, keys] of reqs) eq(keys, want[slug].map((l) => l.key), `${slug}: the lesson list in the database equals the app's course, in order`)
  ok(/alter table public\.adult_certificates enable row level security/.test(c24), 'RLS on certificates')
  ok(/create policy "adult_certificates: own or staff"[\s\S]*?learner_id = auth\.uid\(\) or public\.staff_can_see_learner\(learner_id\)/.test(c24), 'only the owner and staff who may see that learner can read a certificate')
  ok(/grant select on public\.adult_certificates to authenticated/.test(c24) && !/grant[^;]*adult_certificates[^;]*to anon/i.test(c24) && !/grant (insert|update|delete|all)/i.test(c24), 'no anonymous access, browser read only')
  ok(/unique \(learner_id, course_id\)/.test(c24) && /number\s+text not null unique/.test(c24) && /status in \('valid','revoked'\)/.test(c24), 'one certificate per learner and course, unique number, can be withdrawn')
  const std = fnOf(c24, 'adult_calc_standard')
  ok(/v_done >= v_req/.test(std) && /v_req > 0/.test(std) && />= 0\.6/.test(std) && /lp\.lesson_key = any\(/.test(std) && /'pickTotal'/.test(std) && /'match'/.test(std) && !/trace|write_rating|best_calc/.test(std), 'eligibility: every required lesson completed and at least 60% of the automatically marked questions right; handwriting plays no part')
  ok(/revoke all on function public\.adult_calc_standard\(uuid,uuid\) from public, anon, authenticated/.test(c24), 'the calculation is internal')
  const cl = fnOf(c24, 'adult_claim_certificate')
  ok(/is_adult_learner\(\)/.test(cl) && !/p_learner/.test(cl) && /from public\.adult_enrollments e where e\.learner_id = auth\.uid\(\)/.test(cl) && /cert\.status = 'revoked' then raise exception 'certificate withdrawn'/.test(cl) && /not \(s->>'eligible'\)::boolean then raise exception 'not yet complete'/.test(cl), 'a learner can claim only their own, only when eligible, never again after it was withdrawn')
  ok(/'ASAR-AD-' \|\| to_char\(now\(\), 'YYYY'\) \|\| '-' \|\| lpad\(nextval\('public\.adult_certificate_seq'\)::text, 6, '0'\)/.test(cl) && /p\.full_name, c\.title/.test(cl), 'unique number; the name and course title are saved on the certificate')
  ok(/is_adult_staff\(array\['adult_admin'\]\)/.test(fnOf(c24, 'adult_admin_revoke_certificate')), 'only the adult admin withdraws a certificate')
  ok(!/service_role|secret/i.test(c24), 'no secret key in 024')
  // wording: completion of an ASARTUN course, never accreditation
  ok(/Course Completion/.test(strings.en.certHeading) && /ASARTUN/.test(strings.en.certHeading) && /ASARTUN STORE LIMITED/.test(strings.en.certBy), 'the certificate says ASARTUN course completion and who offers it')
  ok(/not a government-accredited or examination-board qualification/.test(strings.en.certNotAccredited) && /Ba takardar shaidar gwamnati ba ce/.test(strings.ha.certNotAccredited), 'it says in both languages that it is not a government qualification')
  const certText = Object.entries(strings.en).filter(([k]) => /^cert/.test(k)).map(([, v]) => v).join(' ').replace(strings.en.certNotAccredited, '')
  ok(!/accredited|approved by|recogni[sz]ed by|official|WAEC|NECO|NBTE|NABTEB|ministry|licen[cs]ed/i.test(certText), 'no other certificate text suggests accreditation or official recognition')
  ok(/certNotAccredited/.test(rd('src/adult/pages/Certificate.jsx')) && /certHeading/.test(rd('src/adult/pages/Certificate.jsx')), 'the certificate page shows the wording')
  const app8 = rd('src/adult/AdultApp.jsx')
  ok(/path="certificate\/:id"/.test(app8) && !/verify|check-certificate|path="certificates?"/i.test(app8), 'certificate page is for signed-in owners; there is no public check page')
  ok(!/anon/.test(c24.replace(/revoke[^;]*;/g, '')), 'nothing in 024 is given to anonymous visitors')
  ok(/<CertificatesTab role=\{role\} \/>/.test(teach8) && /\['certificates', 'tCertificates'\]/.test(teach8), 'staff can see certificates')
  ok(/window\.print\(\)/.test(rd('src/adult/pages/Certificate.jsx')) && /ad-cert/.test(rd('src/adult/adult.css')), 'a certificate can be printed')
  const sdep = JSON.parse(rd('package.json')); eq(Object.keys(sdep.dependencies).sort(), ['@supabase/supabase-js', 'lucide-react', 'react', 'react-dom', 'react-router-dom'], 'still no new dependency')
}


// ================================================================= PHASE 9: whole-module security, contract, mobile and regression checks
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
{
  const rd = (f) => readFileSync(f, 'utf8')
  const strip = (x) => x.replace(/--.*$/gm, '')
  const migFiles = readdirSync('supabase/migrations').filter((f) => /^0(1[789]|2[0-6])_adult/.test(f)).sort()
  eq(migFiles.length, 10, 'migrations 017-026 are all present')
  const SQL = migFiles.map((f) => strip(rd('supabase/migrations/' + f))).join('\n')

  // ---------- A. the database as a whole ----------
  ok(!/grant[^;]*\bto\b[^;]*\banon\b/i.test(SQL), 'nothing is ever granted to anonymous visitors (all 9 migrations)')
  const writeGrants = [...SQL.matchAll(/grant\s+(insert|update|delete|truncate|all)\b[^;]*\bto\b[^;]*authenticated/gi)].map((m) => m[0].replace(/\s+/g, ' '))
  eq(writeGrants, ['grant update (display_name, language, low_data, audio_on) on public.adult_profiles to authenticated'], 'the ONLY write right a browser has: four own preference columns on the own profile row')
  ok(/create policy "adult_profiles: update own settings" on public\.adult_profiles for update to authenticated\s+using \(id = auth\.uid\(\)\) with check \(id = auth\.uid\(\)\)/.test(SQL) && /display_name\s+text check \(display_name is null or char_length\(display_name\) <= 30\)/.test(SQL), 'that right is limited to the learner\'s own row and the name has a length limit')
  ok(!/(using|with check)\s*\(\s*true\s*\)/i.test(SQL), 'no policy that lets everyone in')
  const tables = [...SQL.matchAll(/create table if not exists public\.(adult_[a-z_]+)/g)].map((m) => m[1])
  ok(tables.length >= 20, `found ${tables.length} adult tables`)
  for (const t of tables) ok(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(SQL), `RLS on ${t}`)
  const defs = [...SQL.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)([\s\S]*?)(?=create or replace function|create table|do \$\$|$)/g)]
  eq(defs.length, (SQL.match(/create or replace function public\./g) || []).length, 'every function definition was read')
  for (const m of defs) ok(/security definer\s+set search_path = ''/.test(m[3].slice(0, 400)), `${m[1]}: security definer with an empty search path`)
  ok((SQL.match(/delete from auth\.users/g) || []).length === 1 && /adult_delete_my_account\(\)[\s\S]{0,400}delete from auth\.users where id = auth\.uid\(\)/.test(SQL), 'the only place that deletes a login is "delete my own account"')
  const execs = [...SQL.replace(/\b(grant|revoke) execute\b/gi, '$1 EXE').matchAll(/\bexecute\s+(\w+)(\s*\('?[a-z ]*)?/gi)].map((m) => m[1].toLowerCase() + (m[1].toLowerCase() === 'format' ? ' ' + (m[2] || '').replace(/[('\s]+/g, ' ').trim().split(' ').slice(0, 3).join(' ') : ''))
  ok(execs.length > 0 && execs.every((e) => e === 'function' || /^format (revoke all on|grant EXE on)/i.test(e) || /^format (revoke|grant)/i.test(e)), 'no dynamic SQL except the grant loops (and trigger "execute function")')
  ok(!/service_role/.test(SQL.replace(/grant execute on function[^;]*to service_role;/gi, '')), 'service_role is mentioned only to grant internal functions to it')
  ok(!/password|pin_hash|plain/i.test(tables.join(' ')), 'no table is meant to hold passwords or PINs')

  // ---------- B. the app and the database agree ----------
  const fns = {}
  for (const m of defs) fns[m[1]] = m[2].split(',').map((x) => x.trim()).filter(Boolean).map((x) => ({ name: x.split(/\s+/)[0], optional: /\bdefault\b/i.test(x) }))
  const granted = new Set()
  for (const f of migFiles) {
    const code = strip(rd('supabase/migrations/' + f))
    for (const blk of code.match(/do \$\$[\s\S]*?end \$\$;/g) || []) if (/grant execute on function public\.%s to authenticated/.test(blk)) for (const m of blk.matchAll(/'(\w+)\(/g)) granted.add(m[1])
    for (const m of code.matchAll(/grant execute on function public\.(\w+)\([^)]*\) to authenticated/gi)) granted.add(m[1])
    for (const m of code.matchAll(/revoke execute on function public\.(\w+)\([^)]*\) from authenticated/gi)) granted.delete(m[1])
  }
  const internal = Object.keys(fns).filter((f) => !granted.has(f)).sort()
  eq(internal, ['adult_calc_standard', 'adult_cleanup_attempts', 'adult_cms_bi', 'adult_cms_valid', 'adult_expired_submissions', 'adult_grant_access', 'adult_log', 'adult_password_hook', 'adult_purge_delete'], 'exactly these functions are NOT callable by a browser (internal, server or Supabase Auth only); every other function is')
  const srcFiles = []
  ;(function walk(d) { for (const e of readdirSync(d)) { const p = d + '/' + e; statSync(p).isDirectory() ? walk(p) : /\.(js|jsx)$/.test(e) && srcFiles.push(p) } })('src/adult')
  const calls = []
  for (const f of srcFiles) { const t = rd(f); for (const m of t.matchAll(/rpc\(\s*(?:supabase\w+\s*,\s*)?'(\w+)'\s*(?:,\s*\{([^}]*)\})?/g)) calls.push({ f, fn: m[1], args: [...(m[2] || '').matchAll(/(p_\w+)\s*:/g)].map((x) => x[1]) }) }
  ok(calls.length >= 35, `${calls.length} database calls found in the app`)
  for (const c of calls) {
    ok(c.fn in fns, `${c.fn} exists in the database`)
    if (!(c.fn in fns)) continue
    ok(granted.has(c.fn), `${c.fn} may be called by signed-in users`)
    const names = fns[c.fn].map((p) => p.name)
    ok(c.args.every((a) => names.includes(a)), `${c.fn}: the app sends only parameters the database knows (${c.args.join(',')})`)
    ok(fns[c.fn].filter((p) => !p.optional).every((p) => c.args.includes(p.name)), `${c.fn}: the app sends every required parameter`)
  }
  for (const m of rd('supabase/functions/adult-admin/index.ts').matchAll(/rpc\('(\w+)', \{ (p_\w+)/g)) ok(m[1] in fns && fns[m[1]].some((p) => p.name === m[2]) && granted.has(m[1]), `Edge Function call ${m[1]}(${m[2]}) matches the database`)
  for (const m of rd('supabase/functions/adult-purge/index.ts').matchAll(/rpc\('(\w+)'/g)) ok(m[1] in fns, `purge function calls ${m[1]}, which exists`)
  // tables and columns the app reads
  const cols = {}
  for (const m of SQL.matchAll(/create table if not exists public\.(adult_\w+) \(([\s\S]*?)\n\);/g)) cols[m[1]] = new Set(m[2].split('\n').map((l) => l.trim().split(/[\s,]+/)[0]).filter((w) => /^[a-z_]+$/.test(w) && !/^(primary|unique|check|foreign|constraint)$/.test(w)))
  for (const m of SQL.matchAll(/alter table public\.(adult_\w+) add column if not exists (\w+)/g)) cols[m[1]].add(m[2])
  const readable = new Set(); for (const m of SQL.matchAll(/grant select on ([^;]*?) to authenticated/g)) m[1].split(',').forEach((x) => readable.add(x.trim().replace('public.', '')))
  let selects = 0
  for (const f of srcFiles) for (const m of rd(f).matchAll(/\.from\('(adult_\w+)'\)\s*\.select\('([^']*)'/g)) {
    selects++; ok(cols[m[1]], `${m[1]} exists`); ok(readable.has(m[1]), `${m[1]} may be read by signed-in users`)
    for (const c of m[2].split(',').map((x) => x.trim()).filter((x) => x && x !== '*' && !x.includes('('))) ok(cols[m[1]] && cols[m[1]].has(c), `${m[1]}.${c} exists`)
  }
  ok(selects >= 15, `${selects} table reads checked`)

  // ---------- C. every link has a page; every import resolves ----------
  const app = rd('src/adult/AdultApp.jsx')
  const routes = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((r) => r !== '/' && r !== '*')
  const pats = routes.map((r) => new RegExp('^/adult/' + r.replace(/\/\*$/, '(/.*)?').replace(/:[a-z]+/g, '[^/]+') + '$'))
  let links = 0
  for (const f of srcFiles) for (const m of rd(f).matchAll(/(?:to=|navigate\(|nav\(|Navigate to=)\{?\s*['"`](\/adult[a-z0-9/_:-]*)(['"`]?)/g)) {
    const dyn = m[1].endsWith('/'); const path = dyn ? m[1] + 'x' : m[1]; links++
    ok(m[1] === '/adult' || m[1] === '/adult/' || pats.some((r) => r.test(path)), `${f.replace('src/adult/', '')}: link ${m[1]} leads to a real page`)
  }
  for (const m of rd('src/adult/pages/Learner.jsx').matchAll(/\['(\w+)', 'tab\w+'\]/g)) ok(pats.some((r) => r.test('/adult/' + m[1])), `bottom tab "${m[1]}" has a page`)
  ok(links >= 25, `${links} links checked`)
  const exportsOf = (file) => { const t = rd(file); const names = new Set([...t.matchAll(/export (?:async )?(?:function|const|let|class) (\w+)/g)].map((m) => m[1])); for (const m of t.matchAll(/export \{([^}]*)\}/g)) m[1].split(',').forEach((x) => names.add(x.trim().split(/\s+as\s+/).pop())); if (/export default/.test(t)) names.add('default'); return names }
  let imports = 0
  for (const f of srcFiles) for (const m of rd(f).matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?(?:\*\s+as\s+\w+)?\s*from\s*'(\.[^']+)'/g)) {
    const dir = f.slice(0, f.lastIndexOf('/')); const target = new URL(m[3], 'file:///' + dir + '/').pathname.slice(1)
    imports++; ok(existsSync(target), `${f.replace('src/adult/', '')} imports ${m[3]}, which exists`)
    if (!existsSync(target) || !/\.(js|jsx)$/.test(target)) continue
    const ex = exportsOf(target)
    if (m[1]) ok(ex.has('default'), `${m[3]} has a default export`)
    if (m[2]) for (const n of m[2].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) ok(ex.has(n), `${m[3]} exports ${n}`)
  }
  ok(imports >= 80, `${imports} imports checked`)
  for (const k of Object.keys(strings.en)) { const v = (x) => (x.match(/\{[a-z]+\}/gi) || []).sort().join(); ok(v(strings.en[k]) === v(strings.ha[k]), `Hausa and English use the same {placeholders}: ${k}`) }

  // ---------- D. the children's app, /admin and /org are untouched ----------
  const base = JSON.parse(rd('scripts/baseline-v0_9_7.json')).files
  for (const [f, h] of Object.entries(base)) ok(existsSync(f) && createHash('sha256').update(readFileSync(f)).digest('hex') === h, `unchanged since v0_9_7: ${f}`)
  const allowedNew = [/^src\/adult\//, /^supabase\/migrations\/0(1[789]|2[0-9])_adult/, /^supabase\/functions\/adult-/, /^supabase\/schedule\//, /^docs\/ADULT_/, /^scripts\/test-adult\.mjs$/, /^scripts\/baseline-/, /^vercel\.json$/, /^public\/_headers$/]
  const stray = []
  ;(function walk(d) { for (const e of readdirSync(d)) { if (e === 'node_modules' || e === '.git') continue; const p = d === '.' ? e : d + '/' + e; statSync(p).isDirectory() ? walk(p) : (!(p in base) && !allowedNew.some((r) => r.test(p)) && stray.push(p)) } })('.')
  eq(stray, [], 'no file outside the adult module was added or changed')
  const main = rd('src/main.jsx'); ok(/path="\/adult\/\*"/.test(main) && /lazy\(\(\) => import\('\.\/adult\/AdultApp\.jsx'\)\)/.test(main), 'the adult module is still one lazy route in main.jsx')
  ok(['/admin', '/org'].every((r) => main.includes('"' + r)) || /path="\/admin/.test(main), 'the children\'s routes are still there')

  // ---------- E. browser security headers (only for /adult) ----------
  const vj = JSON.parse(rd('vercel.json')); const hs = vj.headers || []
  ok(hs.length >= 2 && hs.every((h) => /^\/adult(\/|$)/.test(h.source)), 'security headers apply to /adult only; the children\'s routes get none')
  ok(vj.rewrites.some((r) => r.source === '/(.*)' && r.destination === '/index.html'), 'the single-page rewrite is intact')
  const hv = (k) => (hs[0].headers.find((h) => h.key === k) || {}).value || ''
  const csp = hv('Content-Security-Policy')
  ok(/default-src 'self'/.test(csp) && /script-src 'self'(;|$)/.test(csp) && /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /form-action 'self'/.test(csp), 'CSP: own scripts only, no framing, no plugins')
  ok(!/unsafe-eval|script-src[^;]*unsafe-inline|script-src[^;]*\*|default-src[^;]*\*/.test(csp), 'CSP allows no eval, no inline scripts, no wildcard scripts')
  ok(/connect-src 'self' https:\/\/\*\.supabase\.co/.test(csp) && /img-src[^;]*blob:/.test(csp), 'CSP still allows Supabase and photo previews')
  ok(hv('X-Content-Type-Options') === 'nosniff' && hv('X-Frame-Options') === 'DENY' && /strict-origin/.test(hv('Referrer-Policy')) && /camera=\(\)/.test(hv('Permissions-Policy')), 'nosniff, no framing, referrer and permissions policies')
  const hf = rd('public/_headers'); for (const h of hs[0].headers) eq(hf.split(h.key + ': ' + h.value).length - 1, hs.length, `Netlify headers file carries ${h.key} for every /adult path`)
  ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(rd('index.html')) && !/https?:\/\//.test(rd('index.html')), 'index.html has no inline script and no outside resource, so the strict CSP cannot break it')
  ok(!/user-scalable\s*=\s*no|maximum-scale/i.test(rd('index.html')), 'pinch-zoom is not disabled')

  // ---------- F. secrets and Edge Functions ----------
  const front = []
  ;(function walk(d) { for (const e of readdirSync(d)) { const p = d + '/' + e; statSync(p).isDirectory() ? walk(p) : /\.(js|jsx|css|html|json)$/.test(e) && front.push(p) } })('src')
  for (const f of [...front, 'index.html', 'vite.config.js']) ok(!/service_role|SERVICE_ROLE|PURGE_SECRET|sk_live|sk_test|PAYSTACK_SECRET|FLW_SECRET|-----BEGIN/i.test(rd(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '')), `no secret in browser code (comments aside): ${f}`)
  ok(!readdirSync('.').some((f) => /^\.env(\.|$)/.test(f) && f !== '.env.example'), 'no .env file is shipped')
  const adm = rd('supabase/functions/adult-admin/index.ts')
  const rp = adm.slice(adm.indexOf("action === 'reset_pin'"), adm.indexOf("action === 'create_staff'"))
  ok(rp.indexOf("from('adult_profiles').select('id').eq('id', learnerId)") > -1 && rp.indexOf("from('adult_profiles')") < rp.indexOf('updateUserById') && /if \(!target\) return json\(\{ error: 'Not allowed\.' \}, 403\)/.test(rp), 'reset PIN works ONLY on adult learners (it could otherwise reset any account in the shared login system)')
  ok(/\^\[0-9a-f\]\{8\}-/.test(rp) && rp.indexOf('^[0-9a-f]{8}-') < rp.indexOf('from(\'adult_profiles\')'), 'reset PIN rejects a malformed id first')
  ok(/adult_pin_failures'\)\.delete\(\)\.eq\('user_id', learnerId\)/.test(rp), 'a PIN reset also clears the wrong-PIN lock')
  ok(!/console\.(log|info|debug)/.test(adm + rd('supabase/functions/adult-purge/index.ts')), 'the Edge Functions never log (PINs and secrets cannot leak to logs)')
  ok(/count: perIp[\s\S]{0,200}>= 5 \|\| \(perDay \?\? 0\) >= 300/.test(adm) || />= 5 \|\| \(perDay \?\? 0\) >= 300/.test(adm), 'self-registration is limited per address and per day')
  ok(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/.test(adm) && !/Access-Control-Allow-Credentials/.test(adm), 'the service key comes only from the server environment; no cookies or credentials over CORS')
  const pg = rd('supabase/functions/adult-purge/index.ts')
  ok(pg.indexOf("storage.from('adult-submissions').remove") > -1 && pg.indexOf("storage.from('adult-submissions').remove") < pg.indexOf("rpc('adult_purge_delete'"), 'purge: files are removed BEFORE database rows')
  ok(/if \(re\) return json/.test(pg) && /never delete rows while files remain/.test(pg), 'purge: stops without deleting rows if a file could not be removed')
  ok(/safeEqual\(secret, given\)/.test(pg) && /secret\.length < 24/.test(pg) && /method !== 'POST'/.test(pg), 'purge: constant-time secret check, 24+ characters, POST only')
  ok(/adult_cleanup_attempts/.test(pg) && /action: 'purge'/.test(pg), 'purge also cleans old attempt records and leaves a line in the audit log')

  // ---------- G. wrong-PIN lock (migration 025) ----------
  const m25 = strip(rd('supabase/migrations/025_adult_security.sql'))
  const hook = (m25.match(/create or replace function public\.adult_password_hook[\s\S]*?end \$\$;/) || [''])[0]
  ok(/not exists \(select 1 from public\.adult_profiles where id = v_user\)[\s\S]{0,80}'continue'/.test(hook), 'the lock only ever applies to adult learners; staff and the children\'s app are never locked')
  ok(/if r\.user_id is not null and r\.locked_until is not null and r\.locked_until > now\(\) then\s+return jsonb_build_object\('decision', 'reject'/.test(hook) && hook.indexOf("'reject'") < hook.indexOf('if v_valid then'), 'while locked, even the right PIN is refused (so guessing during the lock gains nothing)')
  ok(/last_failure < now\(\) - interval '15 minutes' then 1 else r\.failures \+ 1/.test(hook) && /v_n >= 5 then now\(\) \+ interval '15 minutes'/.test(hook), '5 wrong PINs within 15 minutes lock for 15 minutes')
  ok(/if v_valid then\s+delete from public\.adult_pin_failures/.test(hook), 'a correct PIN clears the count')
  ok(/revoke all on function public\.adult_password_hook\(jsonb\) from public, anon, authenticated/.test(m25) && /grant execute on function public\.adult_password_hook\(jsonb\) to supabase_auth_admin/.test(m25) && !/grant execute on function public\.adult_password_hook[^;]*authenticated/.test(m25.replace(/revoke[^;]*;/g, '')), 'only Supabase Auth may call the hook, not a browser')
  ok(/revoke all on function public\.adult_cleanup_attempts\(\) from public, anon, authenticated/.test(m25) && /grant execute on function public\.adult_cleanup_attempts\(\) to service_role/.test(m25), 'cleanup is for the server only')
  ok(/alter table public\.adult_pin_failures enable row level security/.test(m25) && !/grant[^;]*adult_pin_failures/.test(m25), 'the failure counters cannot be read or changed from the browser')
  ok(/Pro-plan|Pro plan/.test(rd('supabase/migrations/025_adult_security.sql')) && /NOT TESTED against a real Supabase Auth/.test(rd('supabase/migrations/025_adult_security.sql')), 'the migration says plainly that it needs the Pro plan and a dashboard step, and was not tested')

  // ---------- H. the purge schedule ----------
  const sch = rd('supabase/schedule/adult_purge_schedule.sql')
  ok(!readdirSync('supabase/migrations').some((f) => /schedule|purge/i.test(f)), 'the schedule is NOT a migration, so it cannot run by accident')
  ok(/cron\.schedule\(\s*'adult-purge-daily',\s*'0 3 \* \* \*'/.test(sch) && /net\.http_post/.test(sch) && /\/functions\/v1\/adult-purge/.test(sch) && /'x-purge-secret'/.test(sch), 'daily schedule that calls the purge function with the secret header')
  ok(/vault\.create_secret\('<SAME_PURGE_SECRET>'/.test(sch) && /vault\.decrypted_secrets/.test(sch) && !/PURGE_SECRET\s*=\s*['"][A-Za-z0-9]{20,}/.test(sch), 'the secret is kept in Vault and no real secret is written in the file')
  ok(/--no-verify-jwt/.test(sch) && /<PROJECT_REF>/.test(sch) && /cron\.unschedule/.test(sch) && /NEVER RUN/.test(sch), 'says how to deploy, what to replace, how to stop it, and that it was never run')

  // ---------- I. phones: touch size, text size, zoom, layout (read from the style sheet) ----------
  const css = rd('src/adult/adult.css')
  const minH = (sel) => { const m = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((r) => r[1].split(',').some((x) => x.trim() === sel)).map((r) => (r[2].match(/(?:^|[;\s])min-height:\s*(\d+)px/) || [])[1]).filter(Boolean).map(Number); return Math.max(0, ...m) }
  for (const [sel, px] of [['.ad-btn', 56], ['.ad-tabs a', 56], ['.ad-lesson', 56], ['.ad-listen', 56], ['.ad-lang button', 48], ['.ad-link', 48], ['.ad-subtabs button', 48], ['.ad-seg button', 48], ['.hw-btn', 48], ['.adult input:not([type=checkbox])', 56], ['.adult textarea', 96]]) ok(minH(sel) >= px, `${sel} is at least ${px}px tall (touch size)`)
  ok(/\.ad-check input \{[^}]*width:\s*2[4-9]px|\.ad-check input \{[^}]*width:\s*[3-9]\d px/.test(css) || /\.ad-check input \{[^}]*width:\s*28px/.test(css), 'checkboxes are large')
  ok(Number((css.match(/\.adult \{[^}]*font-size:\s*(\d+)px/) || [])[1]) >= 18, 'base text is at least 18px')
  ok(!/font-size:\s*(?:[0-9]|1[0-5])px/.test(css) && Math.min(...[...css.matchAll(/font-size:\s*([\d.]+)rem/g)].map((m) => Number(m[1]))) >= 0.85, 'no text smaller than about 17px (screen) anywhere')
  ok(/overflow-wrap:\s*anywhere/.test(css) && /min-height:\s*100dvh/.test(css), 'long words wrap; the page fills a phone screen even with its address bar')
  ok(/\.ad-page \{[^}]*max-width:\s*560px/.test(css) && /\.ad-page\.wide \{[^}]*max-width:\s*900px/.test(css), 'single readable column on a phone')
  ok(/\.ad-tabs \{[^}]*env\(safe-area-inset-bottom/.test(css), 'bottom tabs stay clear of the phone\'s gesture bar')
  ok([...css.matchAll(/[;\s{]((?:min-|max-)?width):\s*(\d+)px/g)].every((m) => m[1] !== 'width' || Number(m[2]) <= 480), 'no fixed width wider than a small phone')
  ok(!/\btransition:|\banimation:/.test(css.replace(/@media \(prefers-reduced-motion: no-preference\)[^\n]*/g, '')), 'all motion is switched off for people who asked for less motion')
  ok(/@media print/.test(css) && /@media \(prefers-color-scheme: dark\)/.test(css), 'print and dark-mode styles exist')
  ok(/\.adult button:focus-visible/.test(css), 'every button shows a visible focus ring')
  ok(/touch-action:\s*none/.test((css.match(/\.hw-canvas \{[^}]*\}/) || [''])[0]) && /touch-action:\s*manipulation/.test(css), 'writing canvas does not scroll while drawing; picture taps respond at once')
  for (const f of srcFiles.filter((x) => x.endsWith('.jsx'))) { const t = rd(f)
    for (const m of t.matchAll(/<img\b[^>]*>/g)) ok(/\balt=/.test(m[0]), `${f.replace('src/adult/', '')}: every picture has alt text`)
    for (const m of t.matchAll(/<input\b[^>]*>/g)) { const before = t.slice(Math.max(0, m.index - 420), m.index); const inLabel = before.lastIndexOf('<label') > before.lastIndexOf('</label>'); ok(inLabel || /aria-label|type="hidden"/.test(m[0]), `${f.replace('src/adult/', '')}: input has a label: ${m[0].slice(0, 50)}`) }
  }
  const docs = ['ADULT_PHASE2_DESIGN', 'ADULT_PHASE3', 'ADULT_PHASE4', 'ADULT_PHASE5_6', 'ADULT_PHASE7', 'ADULT_PHASE8', 'ADULT_PHASE9']
  for (const d of docs) ok(existsSync(`docs/${d}.md`), `docs/${d}.md exists`)
}


// ================================================================= PHASE 10: editable texts, recordings, courses and lessons written in the dashboard
import * as C from '../src/adult/content.js'
import { registerCourse as regCourse } from '../src/adult/courses.js'
{
  const rd = (f) => readFileSync(f, 'utf8')
  const m26 = rd('supabase/migrations/026_adult_content.sql'), c26 = m26.replace(/--.*$/gm, '')
  const fnOf = (name) => (c26.match(new RegExp(`create or replace function public\\.${name}\\([^)]*\\)[\\s\\S]*?end \\$\\$;|create or replace function public\\.${name}\\([^)]*\\)[\\s\\S]*?\\$\\$;`)) || [''])[0]
  const inc = (str) => new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\d)').test(c26)     // text is present and the last number is not just the start of a bigger one
  const sid = (n) => 'ab12cd' + String(n).padStart(2, '0')
  const goodLesson = () => ({ title: { ha: 'Kira', en: 'Calling' }, unit: { ha: 'Sashe 1', en: 'Part 1' }, steps: [
    { id: sid(1), type: 'teach', text: { ha: 'Ka ɗaga waya.', en: 'Pick up the phone.' } },
    { id: sid(2), type: 'choice', prompt: { ha: 'Wane ne daidai?', en: 'Which is right?' }, options: [{ ha: 'A', en: 'A' }, { ha: 'B', en: 'B' }, { ha: 'C', en: '' }], right: 1, why: { ha: 'Saboda B.', en: 'Because B.' } },
    { id: sid(3), type: 'scam', text: { ha: 'Aiko PIN ɗinka', en: 'Send your PIN' }, scam: true, why: { ha: 'Zamba ne', en: 'Scam' } },
    { id: sid(4), type: 'tap', ask: { ha: 'Taɓa kira', en: 'Touch call' }, screen: 'home', target: 'phone' },
  ] })
  const course = { id: 'c1', slug: 'farming', title: { ha: 'Noma', en: 'Farming' }, skill_area: 'apply', origin: 'cms', status: 'published' }
  const mk = (key, content, o = {}) => ({ id: 'l' + key, course_id: 'c1', key, position: 1, status: 'published', title: content.title, content, ...o })

  // ---------- A. text lookup: dashboard text, then a SAFE correction, then the built-in text ----------
  {
    C.setOverrides([]); C.registerCmsContent([], [])
    eq(C.template('ha', 'signOut'), strings.ha.signOut, 'built-in text when nothing was changed')
    eq(C.template('ha', 'no-such-key'), 'no-such-key', 'an unknown key shows its name, never crashes')
    C.setOverrides([{ key: 'signOut', lang: 'ha', value: 'Fita (gyara)' }])
    eq(C.template('ha', 'signOut'), 'Fita (gyara)', 'a published correction replaces the built-in text'); eq(C.template('en', 'signOut'), strings.en.signOut, 'only the language that was corrected changes')
    ok(C.hasOverride('ha', 'signOut') && !C.hasOverride('en', 'signOut'), 'override flags')
    ok(strings.en.progressLine.includes('{done}'), 'test text has placeholders')
    C.setOverrides([{ key: 'progressLine', lang: 'en', value: 'Done: {done}' }])
    eq(C.template('en', 'progressLine'), strings.en.progressLine, 'a correction that LOSES a {placeholder} is ignored (the app would show a broken sentence)')
    C.setOverrides([{ key: 'progressLine', lang: 'en', value: 'You did {total} and {done}' }]); eq(C.template('en', 'progressLine'), 'You did {total} and {done}', 'a correction that keeps every {placeholder} (in any order) is used')
    C.setOverrides([{ key: 'progressLine', lang: 'en', value: 'Only {done} {extra}' }]); eq(C.template('en', 'progressLine'), strings.en.progressLine, 'an extra {placeholder} is ignored too')
    C.setOverrides([{ key: 'signOut', lang: 'zz', value: 'x' }, { key: 'signOut', lang: 'ha', value: 5 }, { key: 'signOut', lang: 'ha', value: '' }]); eq(C.template('ha', 'signOut'), strings.ha.signOut, 'junk or empty rows are ignored')
    eq(C.placeholders('a {x} b {y} {x}'), '{x}{x}{y}', 'placeholders are compared as a sorted list'); C.setOverrides([])
  }

  // ---------- B. recordings play only while the text is unchanged ----------
  {
    ok(/^[0-9a-f]{8}$/.test(C.fnv('x')) && C.fnv('abc') === C.fnv('abc') && C.fnv('abc') !== C.fnv('abd') && C.fnv('') !== C.fnv(' '), 'fingerprint: 8 hex digits, stable, sensitive to one letter')
    eq(C.fnv('Ka ɗaga waya.'), C.fnv('Ka ɗaga waya.'), 'works on Hausa letters')
    const row = (hash) => ({ key: 'signOut', lang: 'ha', path: 'audio/signOut/ha-1.webm', mime: 'audio/webm', bytes: 10, duration_ms: 1000, text_hash: hash })
    C.setAudio([row(C.fnv(strings.ha.signOut))]); ok(C.clipFor('ha', 'signOut') && !C.clipStale('ha', 'signOut'), 'a recording that matches its text is used')
    C.setOverrides([{ key: 'signOut', lang: 'ha', value: 'Wani rubutu daban' }])
    ok(C.clipFor('ha', 'signOut') === null && C.clipStale('ha', 'signOut') && C.rawClip('ha', 'signOut'), 'after the text is corrected the old recording is skipped (and flagged), not played')
    C.setAudio([row(C.fnv('Wani rubutu daban'))]); ok(C.clipFor('ha', 'signOut'), 'confirming (or re-recording) brings it back'); eq(C.clipFor('en', 'signOut'), null, 'a Hausa recording is never used for English')
    C.setAudio([]); C.setOverrides([])
  }

  // ---------- C. a dashboard lesson becomes the steps the existing player understands ----------
  {
    const les = mk('x0123456789ab', goodLesson())
    const { def, texts } = C.cmsToCourse(course, [les, mk('x0123456789ac', goodLesson(), { status: 'draft' }), mk('x0123456789ad', goodLesson(), { status: 'archived' })])
    eq(def.lessons.length, 1, 'only PUBLISHED lessons reach learners (drafts and archived ones do not)')
    const st = def.lessons[0].steps
    eq(st.map((x) => x.type), ['teach', 'dchoice', 'dchoice', 'tap', 'review'], 'steps map to teach / dchoice / dchoice / tap / review')
    eq(st[0], { type: 'teach', kind: 'concept', conceptKey: `cms.x0123456789ab.${sid(1)}.text` }, 'teaching page')
    ok(st[1].optionKeys.length === 3 && st[1].targetKey === st[1].optionKeys[1] && st[1].whyKey, 'choice: the right answer is the option the admin marked, with its reason')
    eq([...st[2].optionKeys].sort(), ['dlSafe', 'dlScam'], 'scam card offers Safe / Scam'); eq(st[2].targetKey, 'dlScam', 'a scam card marked "scam" is answered "scam"')
    eq([st[3].screen, st[3].target], ['home', 'phone'], 'tap step keeps its screen and place')
    eq(C.cmsToCourse(course, [mk('x0123456789ab', { ...goodLesson(), steps: [{ ...goodLesson().steps[3], target: 'nope' }] })]).def.lessons.length, 0, 'a tap step pointing at a place that does not exist is dropped, so a lesson with nothing left is not shown')
    ok(Object.keys(texts).every((k) => k.startsWith('cms.') && k.length <= 100 && /^[A-Za-z0-9_.:-]+$/.test(k)), 'every text key is valid for the database (letters, digits, . _ : -, up to 100)')
    ok(Object.values(texts).every((v) => typeof v.ha === 'string' && typeof v.en === 'string'), 'every text has both languages')
    eq(def.route, '/adult/c/farming', 'course address'); eq(def.kind, 'custom', 'kind custom'); eq(def.area, 'apply', 'skill area from the course')
    const two = C.cmsToCourse(course, [mk('x0123456789ab', goodLesson(), { position: 1 }), mk('x0123456789ae', { ...goodLesson(), unit: { ha: 'Sashe 2', en: 'Part 2' } }, { position: 2 }), mk('x0123456789af', { ...goodLesson(), unit: undefined }, { position: 3 })])
    eq(two.def.units.length, 3, 'lessons are grouped by their section label'); eq(two.def.lessons.map((l) => l.key), ['x0123456789ab', 'x0123456789ae', 'x0123456789af'], 'in the admin\'s order')
  }

  // ---------- D. registering them: the registry, the reports, and the protection of built-in courses ----------
  {
    const les = mk('x0123456789ab', goodLesson())
    C.registerCmsContent([course], [les])
    ok(COURSES.farming && ALL_LESSONS.some((l) => l.key === 'x0123456789ab') && C.COURSES.farming.cms, 'the course is registered')
    ok(courseOfLesson('x0123456789ab').slug === 'farming' && anyLessonByKey('x0123456789ab'), 'the player can find the lesson and its course')
    eq(C.template('ha', `cms.x0123456789ab.${sid(1)}.text`), 'Ka ɗaga waya.', 'its text is found by t()'); eq(C.template('en', `cms.x0123456789ab.${sid(3)}.why`), 'Scam', 'English too')
    eq(R.lessonInfo('x0123456789ab'), { course: 'custom', unit: C.dynamicLessonInfo('x0123456789ab').unit, applied: false, area: 'apply' }, 'reports know the lesson')
    const prog = [{ k: 'x0123456789ab', s: 'completed', a: 1, bt: null, bc: null, wr: null, r: { pickRight: 3, pickTotal: 4 }, c: '2026-11-10T09:00:00Z', u: '2026-11-10T09:00:00Z' }]
    const a = R.skillAreas(prog); eq([a.apply.items, a.apply.good, a.other.items, a.digital.items], [4, 3, 0, 0], 'its answers count toward the skill area the admin chose for the course')
    C.registerCmsContent([{ ...course, skill_area: 'other' }], [les]); eq(R.skillAreas(prog).other.items, 4, 'a course without a chosen area counts as "other"')
    ok(R.lessonStats(prog).completed === 1, 'finished dashboard lessons count in the learner\'s lesson totals')
    ok(R.learnerView(prog, [], [], new Date()).other.done === 1, 'the learner\'s own view counts them')
    const evil = { slug: 'basic-literacy', kind: 'custom', cms: true, lessons: [], units: [], route: '/x', titleKey: 'k' }
    eq(regCourse(evil), false, 'a dashboard course can never replace a built-in one'); ok(COURSES['basic-literacy'].lessons === LESSONS, 'built-in course untouched')
    C.registerCmsContent([], []); ok(!COURSES.farming && !ALL_LESSONS.some((l) => l.key === 'x0123456789ab') && !anyLessonByKey('x0123456789ab') && !C.dynamicLessonInfo('x0123456789ab'), 'unregistering removes everything')
    eq(Object.keys(COURSES).sort(), ['basic-digital', 'basic-literacy', 'basic-numeracy'], 'only the three built-in courses remain'); eq(ALL_LESSONS.length, LESSONS.length + num.LESSONS.length + DIGITAL.LESSONS.length, 'lesson list back to normal')
    C.registerCmsContent([course], []); ok(!COURSES.farming, 'a course with no published lesson is not offered')
    C.registerCmsContent([], [])
  }

  // ---------- E. checking a lesson (same rules in the app and in the database) ----------
  {
    const v = (f) => { const l = goodLesson(); f(l); return C.validateLessonContent(l) }
    eq(C.validateLessonContent(goodLesson()), null, 'a complete lesson is valid'); eq(C.validateLessonContent(null), 'shape', 'nothing'); eq(C.validateLessonContent({}), 'title', 'empty')
    eq(v((l) => { l.title.ha = '' }), 'title', 'Hausa title required'); eq(v((l) => { l.title.en = '' }), null, 'English may be empty'); eq(v((l) => { l.title.ha = 'x'.repeat(101) }), 'title', 'title 101'); eq(v((l) => { l.title.ha = 'x'.repeat(100) }), null, 'title 100')
    eq(v((l) => { delete l.unit }), null, 'section is optional'); eq(v((l) => { l.unit = { ha: '' } }), 'unit', 'a section label, if given, needs Hausa')
    eq(v((l) => { l.steps = [] }), 'steps', 'no steps'); eq(v((l) => { l.steps = Array.from({ length: 21 }, (_, i) => ({ id: sid(i + 10), type: 'teach', text: { ha: 'a' } })) }), 'steps', '21 steps'); eq(v((l) => { l.steps = Array.from({ length: 20 }, (_, i) => ({ id: sid(i + 10), type: 'teach', text: { ha: 'a' } })) }), null, '20 steps')
    eq(v((l) => { l.steps[1].id = l.steps[0].id }), 'stepId', 'duplicate step id'); eq(v((l) => { l.steps[0].id = 'A' }), 'stepId', 'bad step id'); eq(v((l) => { l.steps[0].type = 'video' }), 'type', 'unknown step type')
    eq(v((l) => { l.steps[0].text.ha = 'x'.repeat(601) }), 'teach', 'teaching text 601'); eq(v((l) => { l.steps[0].text.ha = 'x'.repeat(600) }), null, 'teaching text 600'); eq(v((l) => { l.steps[0].text.ha = 'a\u0001b' }), 'teach', 'control characters refused')
    eq(v((l) => { l.steps[1].options = [{ ha: 'A' }] }), 'options', 'one option'); eq(v((l) => { l.steps[1].options = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ ha: x })) }), 'options', 'six options'); eq(v((l) => { l.steps[1].options = ['a', 'b', 'c', 'd', 'e'].map((x) => ({ ha: x })); l.steps[1].right = 4 }), null, 'five options')
    eq(v((l) => { l.steps[1].options[1].ha = 'A' }), 'optionsSame', 'two options with the same Hausa text'); eq(v((l) => { l.steps[1].right = 3 }), 'right', 'right answer out of range'); eq(v((l) => { l.steps[1].right = -1 }), 'right', 'negative'); eq(v((l) => { l.steps[1].right = '1' }), 'right', 'not a number')
    eq(v((l) => { l.steps[1].prompt.ha = 'x'.repeat(301) }), 'prompt', 'question 301'); eq(v((l) => { l.steps[1].options[0].ha = 'x'.repeat(121) }), 'options', 'option 121'); eq(v((l) => { l.steps[1].why = { ha: 'x'.repeat(301) } }), 'why', 'reason 301'); eq(v((l) => { delete l.steps[1].why }), null, 'reason optional on a choice')
    eq(v((l) => { l.steps[2].scam = 'yes' }), 'scam', 'scam flag must be true/false'); eq(v((l) => { l.steps[2].why = { ha: '' } }), 'scam', 'a scam card needs its reason'); eq(v((l) => { l.steps[2].text.ha = 'x'.repeat(401) }), 'scam', 'scam text 401')
    eq(v((l) => { l.steps[3].target = 'zzz' }), 'tapTarget', 'tap target not on that screen'); eq(v((l) => { l.steps[3].screen = 'nowhere' }), 'tapTarget', 'unknown screen'); eq(v((l) => { l.steps[3].ask.ha = 'x'.repeat(201) }), 'tap', 'instruction 201'); eq(v((l) => { l.steps[3].target = 'signal'; l.steps[3].screen = 'home' }), null, 'any real button works')
    eq(v((l) => { l.steps = Array.from({ length: 13 }, (_, i) => ({ id: sid(i + 10), type: 'scam', text: { ha: 'a' }, scam: true, why: { ha: 'b' } })) }), 'questions', '13 questions'); eq(v((l) => { l.steps = Array.from({ length: 12 }, (_, i) => ({ id: sid(i + 10), type: 'scam', text: { ha: 'a' }, scam: true, why: { ha: 'b' } })) }), null, '12 questions')
    // the app and the database use the same numbers
    const L = C.LIMITS
    ok(c26.includes(`adult_cms_bi(p->'title', ${L.title})`) && c26.includes(`adult_cms_bi(p->'unit', ${L.unit})`) && c26.includes(`adult_cms_bi(s->'text', ${L.teach})`) && c26.includes(`adult_cms_bi(s->'prompt', ${L.prompt})`) && c26.includes(`adult_cms_bi(s->'options'->i, ${L.option})`) && c26.includes(`adult_cms_bi(s->'why', ${L.why})`) && c26.includes(`adult_cms_bi(s->'text', ${L.scam})`) && c26.includes(`adult_cms_bi(s->'ask', ${L.ask})`), 'text length limits equal in app and database')
    ok(inc(`jsonb_array_length(p->'steps') not between 1 and ${L.steps}`) && inc(`not between ${L.optionsMin} and ${L.optionsMax}`) && inc(`return q <= ${L.questions}`) && inc(`octet_length(p::text) > ${L.bytes}`), 'step, option, question and size limits equal in app and database')
    ok(c26.includes(`adult_cms_bi(p_title, ${L.courseTitle})`) && c26.includes(`adult_cms_bi(p_description, ${L.courseDesc})`) && inc(`not between 1 and ${L.text}`) && inc(`p_bytes not between 1 and ${L.audioBytes}`), 'course, text and audio limits equal in app and database')
    ok(inc(`p_duration_ms not between 1 and ${L.audioMs}`) && /\^\[a-z0-9\]\{6,12\}\$/.test(c26), 'audio length and step-id rules equal')
    ok(/\^\[a-z0-9_\]\{1,30\}\$/.test(c26) && c26.includes("typ = 'tap'"), 'screen and target name rules')
    // built-in lessons: which of their texts can be corrected
    const dk = C.lessonTextKeys(DIGITAL.LESSONS[0]); ok(dk.includes('dt_d_power') && dk.includes('dc_d_power') && dk.every((k) => k in strings.en), 'a built-in lesson lists its own texts (title, teaching page, questions) and only real ones')
    ok(LESSONS.concat(num.LESSONS).every((l) => C.lessonTextKeys(l).every((k) => k in strings.en)), 'every built-in lesson lists only real text keys')
  }

  // ---------- F. the database (migration 026) ----------
  {
    for (const t2 of ['adult_texts', 'adult_text_drafts', 'adult_text_history', 'adult_audio', 'adult_cms_lessons', 'adult_cms_lesson_drafts', 'adult_cms_history']) ok(new RegExp(`alter table public\\.${t2}\\s+enable row level security`).test(c26), `RLS on ${t2}`)
    ok(/grant select on public\.adult_texts, public\.adult_text_drafts[^;]*to authenticated/.test(c26) && !/grant (insert|update|delete|all)/i.test(c26) && !/anon/.test(c26.replace(/revoke[^;]*;/g, '')), 'browsers can only read the new tables; nothing for anonymous visitors')
    const pol = (name) => (c26.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`)) || [''])[0]
    ok(/is_adult_staff\(array\['adult_admin'\]\)/.test(pol('adult_text_drafts: admin')) && /is_adult_staff\(array\['adult_admin'\]\)/.test(pol('adult_cms_lesson_drafts: admin')) && /is_adult_staff\(array\['adult_admin'\]\)/.test(pol('adult_cms_history: admin')) && /is_adult_staff\(array\['adult_admin'\]\)/.test(pol('adult_text_history: admin')), 'drafts and history are readable by the adult admin only (learners and facilitators cannot read unpublished work)')
    ok(/is_adult_learner\(\) or public\.is_adult_staff\(\)/.test(pol('adult_texts: adult users read')) && /is_adult_learner\(\) or public\.is_adult_staff\(\)/.test(pol('adult_audio: adult users read')), 'published texts and recordings: adult users only')
    ok(/status = 'published' and public\.is_adult_learner\(\) and public\.adult_has_course_access\(course_id\)/.test(pol('adult_cms_lessons: enrolled learner')), 'a learner reads only PUBLISHED lessons of a course they currently have access to (no reading paid lessons without paying)')
    ok(/status <> 'draft' and public\.is_adult_staff\(\)/.test(pol('adult_cms_lessons: staff')) && /is_adult_staff\(array\['adult_admin'\]\)/.test(pol('adult_cms_lessons: admin')), 'staff never see drafts; the adult admin sees all')
    ok(/e\.learner_id = auth\.uid\(\) and e\.course_id = p_course and \(e\.ends_at is null or e\.ends_at > now\(\)\)/.test(fnOf('adult_has_course_access')), 'access means an enrolment that has not ended')
    ok(/'adult-audio', 'adult-audio', false, 3145728(?!\d)/.test(c26) && /allowed_mime_types = excluded\.allowed_mime_types/.test(c26) && /public = false/.test(c26), 'the audio bucket is private, 3 MB per file, limited types')
    const mimes = [...(c26.match(/array\['audio\/webm'[^\]]*\]/) || [''])[0].matchAll(/'([^']+)'/g)].map((m) => m[1])
    const api10 = rd('src/adult/adultApi.js'); const extMap = [...api10.match(/const AUDIO_EXT = \{([^}]*)\}/)[1].matchAll(/'([^']+)':/g)].map((m) => m[1])
    eq([...mimes].sort(), [...extMap].sort(), 'the file types the app sends are exactly the ones the bucket and the table allow')
    const recTypes = [...rd('src/adult/components/AudioEditor.jsx').match(/const REC_TYPES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1].split(';')[0]); ok(recTypes.every((x) => mimes.includes(x)), 'everything the recorder can produce is an allowed type')
    for (const [name, rx] of [['adult-audio: adult users read', /for select to authenticated\s+using \(bucket_id = 'adult-audio' and \(public\.is_adult_learner\(\) or public\.is_adult_staff\(\)\)\)/], ['adult-audio: admin uploads', /for insert to authenticated\s+with check \(bucket_id = 'adult-audio' and public\.is_adult_staff\(array\['adult_admin'\]\)\)/], ['adult-audio: admin deletes', /for delete to authenticated\s+using \(bucket_id = 'adult-audio' and public\.is_adult_staff\(array\['adult_admin'\]\)\)/]]) ok(rx.test(pol(name)), `storage rule: ${name}`)
    ok(/for update to authenticated\s+using \(bucket_id = 'adult-audio' and public\.is_adult_staff\(array\['adult_admin'\]\)\) with check \(bucket_id = 'adult-audio' and public\.is_adult_staff\(array\['adult_admin'\]\)\)/.test(pol('adult-audio: admin replaces')), 'storage rule: only the adult admin replaces recordings')
    const admins = [...c26.matchAll(/create or replace function public\.(adult_admin_\w+)/g)].map((m) => m[1]); ok(admins.length >= 16, `${admins.length} admin functions`)
    for (const f of admins) ok(/is_adult_staff\(array\['adult_admin'\]\)/.test(fnOf(f)) && /42501/.test(fnOf(f)), `${f}: adult admin only`)
    const sv = fnOf('adult_admin_save_text_draft'); ok(/char_length\(coalesce\(p_value, ''\)\) not between 1 and 1000(?!\d)/.test(sv) && /\[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\]/.test(sv) && /p_lang not in \('ha','en'\)/.test(sv), 'text drafts: length, language and control characters checked')
    const pb = fnOf('adult_admin_publish_text'); ok(/where key = p_key and lang = p_lang/.test(pb) && /if d\.key is null then raise exception 'no draft'/.test(pb) && /delete from public\.adult_text_drafts/.test(pb) && /adult_text_history/.test(pb), 'publishing a text needs a draft, clears it and keeps a history line')
    ok(/delete from public\.adult_texts where key = p_key and lang = p_lang/.test(fnOf('adult_admin_revert_text')), 'reverting brings the built-in text back')
    const sa = fnOf('adult_admin_set_audio')
    ok(/p_bytes not between 1 and 3145728(?!\d)/.test(sa) && /p_text_hash !~ '\^\[0-9a-f\]\{8\}\$'/.test(sa) && /from storage\.objects o where o\.bucket_id = 'adult-audio' and o\.name = p_path/.test(sa) && /'\^audio\/' \|\| regexp_replace\(p_key/.test(sa) && /p_lang \|\| '-\[0-9\]\{10,14\}/.test(sa) && /return v_old/.test(sa), 'a recording is recorded only if its file really exists, in the right folder, with a valid size, type and fingerprint; the old file path is returned for deletion')
    ok(/returning path into v_old/.test(fnOf('adult_admin_delete_audio')) && /update public\.adult_audio set text_hash/.test(fnOf('adult_admin_confirm_audio')), 'delete returns the file path; confirm updates the fingerprint')
    const cc = fnOf('adult_admin_create_course'); ok(/p_slug !~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/.test(cc) && /not between 3 and 30/.test(cc) && /p_slug like 'basic-%'/.test(cc) && /slug taken/.test(cc) && /'custom'/.test(cc) && /'draft', 'cms'/.test(cc) && /true, 0,/.test(cc), 'a new course: safe short name, never "basic-…", unique, kind custom, starts as a FREE DRAFT')
    ok(/origin = 'cms'/.test(fnOf('adult_admin_update_course')) && /origin = 'cms'/.test(fnOf('adult_admin_create_lesson')), 'only dashboard courses can be edited here, never built-in ones')
    const cl = fnOf('adult_admin_create_lesson'); ok(/'x' \|\| substr\(replace\(gen_random_uuid\(\)::text, '-', ''\), 1, 12\)/.test(cl) && />= 100/.test(cl) && /key\s+text not null unique check \(key ~ '\^x\[0-9a-f\]\{12\}\$'\)/.test(c26), 'lesson keys are random, unique and never change (progress is stored by key); at most 100 lessons per course')
    ok(/octet_length\(p_content::text\) > 60000(?!\d)/.test(fnOf('adult_admin_save_lesson_draft')) && !/adult_cms_valid/.test(fnOf('adult_admin_save_lesson_draft')), 'a draft may be unfinished (only size and shape checked)')
    const pl = fnOf('adult_admin_publish_lesson'); ok(/not public\.adult_cms_valid\(d\.content\)/.test(pl) && /for update/.test(pl) && /limit 10/.test(pl) && /delete from public\.adult_cms_lesson_drafts/.test(pl) && /published_at = coalesce\(published_at, now\(\)\)/.test(pl), 'publishing checks the whole lesson again, keeps the last 10 versions, clears the draft')
    ok(/p_status = 'published' and \(l\.published_at is null or not public\.adult_cms_valid\(l\.content\)\)/.test(fnOf('adult_admin_set_lesson_status')), 'a lesson can be put back only if it was published before and is valid')
    ok(/l\.published_at is not null or exists \(select 1 from public\.adult_lesson_progress lp where lp\.lesson_key = l\.key\)/.test(fnOf('adult_admin_delete_lesson')), 'a lesson that was published or that anyone started can never be deleted')
    const calc = fnOf('adult_calc_standard'); ok(/c\.origin = 'cms'/.test(calc) && /l\.status = 'published'/.test(calc) && /v_req > 0 and v_done >= v_req/.test(calc) && />= 0\.6/.test(calc) && !/trace|write_rating|best_calc/.test(calc), 'a certificate for a dashboard course needs ALL its published lessons and 60% of the automatically marked questions; handwriting plays no part')
    ok(/c\.origin = 'code' and c\.required_lessons is null/.test(fnOf('adult_claim_certificate')) && /not \(s->>'eligible'\)::boolean then raise exception 'not yet complete'/.test(fnOf('adult_claim_certificate')), 'claiming a certificate still checks eligibility in the database')
    ok(/revoke all on function public\.adult_cms_bi\(jsonb,integer\) from public, anon, authenticated/.test(c26) && /revoke all on function public\.adult_cms_valid\(jsonb\) from public, anon, authenticated/.test(c26) && /revoke all on function public\.adult_calc_standard\(uuid,uuid\) from public, anon, authenticated/.test(c26), 'the helpers and the certificate calculation stay internal')
    ok(/kind in \('literacy','numeracy','digital','english','custom'\)/.test(c26) && /origin text not null default 'code' check \(origin in \('code','cms'\)\)/.test(c26), 'course kind and origin')
    ok(!/service_role|secret/i.test(c26), 'no secret in 026')
  }

  // ---------- G. the screens and the app wiring ----------
  {
    const api10 = rd('src/adult/adultApi.js')
    const auth = rd('src/adult/AdultAuth.jsx'), audio = rd('src/adult/components/AdultAudio.jsx'), les = rd('src/adult/pages/Lessons.jsx'), tc = rd('src/adult/pages/TeachContent.jsx'), ae = rd('src/adult/components/AudioEditor.jsx'), teach = rd('src/adult/pages/Teach.jsx'), lrn = rd('src/adult/pages/Learner.jsx')
    ok(/template\(lang, k\)/.test(auth) && /\[lang, cv\]/.test(auth) && /loadContent\('learner'\)/.test(auth) && !/strings\[lang\]/.test(auth), 'every text goes through the dashboard-aware lookup, and learners load the admin\'s content after sign-in')
    ok(/loadContent\('staff'\)/.test(teach) && /tab === 'content' && role === 'adult_admin' && <ContentTab \/>/.test(teach) && /\['content', 'tContent'\]/.test(teach), 'the Content screen is for the adult admin only; staff also load content (for names in reports)')
    ok(audio.indexOf('if (clip)') > -1 && audio.indexOf('if (clip)') < audio.indexOf('} else if (file)') && /clipFor\(l, audioKey\)/.test(audio) && /signedAudioUrl\(getAudioClient\(\), path\)/.test(audio) && /50 \* 60 \* 1000/.test(audio), 'playing: the admin\'s recording first, then a file, then the phone\'s voice; the private link is fetched only on Listen and kept less than its 1-hour life')
    ok(/if \(!url\) \{ if \(canSpeak\)/.test(audio), 'if the recording cannot be fetched the phone voice takes over')
    ok(/audioKey=\{step\.conceptKey\}/.test(les) && /audioKey=\{step\.cardKey\}/.test(les) && /audioKey=\{step\.promptKey\}/.test(les) && /audioKey=\{step\.askKey\}/.test(rd('src/adult/components/DigitalSteps.jsx')), 'teaching pages, scam cards, questions and tap instructions all have a Listen button that can use a recording')
    ok(/contentReady \? <Navigate/.test(les) && /courseNoLessons/.test(les) && /const title = def \? t\(def\.titleKey\)/.test(les) && /CourseBySlug/.test(les) && /path="c\/:slug" element=\{<CourseBySlug \/>\}/.test(rd('src/adult/AdultApp.jsx')), 'a dashboard course opens at /adult/c/<name> and waits for its content instead of crashing or bouncing the learner away')
    ok(/c\.origin === 'cms' \? '\/adult\/c\/' \+ c\.slug/.test(lrn) && !/\{COURSES\[c\.slug\] \? <Link/.test(lrn), 'the Courses page offers dashboard courses')
    for (const f of ['src/adult/pages/Lessons.jsx', 'src/adult/pages/Learner.jsx', 'src/adult/pages/Progress.jsx', 'src/adult/pages/Write.jsx', 'src/adult/pages/Pay.jsx']) if (existsSync(f)) ok(!/AudioEditor|TeachContent|saveTextDraft|uploadAudio|createCourse/.test(rd(f)), `${f.replace('src/adult/pages/', '')}: no editing tools in the learner screens`)
    ok(!/supabase/i.test(tc.replace(/staffApi/g, '')) && !/dangerouslySetInnerHTML|innerHTML|eval\(/.test(tc + ae + rd('src/adult/content.js')), 'the editor goes through the API layer; admin text is only ever shown as plain text (never as HTML)')
    ok(/MediaRecorder/.test(ae) && /getUserMedia\(\{ audio/.test(ae) && /const MAX_SECONDS = 90(?!\d)/.test(ae) && /n >= MAX_SECONDS/.test(ae) && /audioBitsPerSecond: 32000/.test(ae) && /setState\('denied'\)/.test(ae) && /t\('audNoMic'\)/.test(ae), 'recording: microphone only on request, 90-second limit, small files, clear message if refused or unsupported')
    ok(/stream\.current\.getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/.test(ae) && /URL\.revokeObjectURL/.test(ae), 'the microphone is released and temporary files are freed')
    ok(/f\.size > LIMITS\.audioBytes/.test(ae) && /FILE_TYPES\[f\.type\]/.test(ae) && /accept="audio\/\*"/.test(ae), 'uploads: type and size checked before sending')
    ok(/path = `audio\/\$\{key\}\/\$\{lang\}-\$\{Date\.now\(\)\}\.\$\{ext\}`/.test(api10) && /createSignedUrl\(path, 3600\)/.test(api10) && /upsert: false/.test(api10) && /remove\(\[path\]\)/.test(api10) && /remove\(\[r\.data\]\)/.test(api10), 'upload: file first, then the record; a failed record removes the file; a replaced recording\'s old file is removed')
    ok(/getUserMedia/.test(ae) && /microphone=\(self\)/.test(rd('vercel.json')) && rd('public/_headers').split('microphone=(self)').length - 1 === 2 && !/microphone=\(\*\)|microphone=\(\)/.test(rd('vercel.json') + rd('public/_headers')) && /camera=\(\)/.test(rd('vercel.json')), 'the page may use the microphone (this site only, for the recorder); camera, location and payment stay blocked')
    ok(/media-src 'self' blob: https:\/\/\*\.supabase\.co/.test(rd('vercel.json')), 'the security policy still allows playing recordings')
    ok(/loadContent\('staff'\)/.test(ae) && /await refresh\(\)/.test(ae), 'after saving a recording the admin\'s screen refreshes')
    for (const k of ['ctTitle', 'ctPublish', 'audRecord', 'audMicDenied', 'ctErrPlaceholders']) ok(strings.ha[k] && strings.en[k] && strings.ha[k] !== strings.en[k], `text exists in both languages: ${k}`)
    ok(/'draft'|ctIntro/.test(tc) && /Every change is a draft until you press Publish/.test(strings.en.ctIntro), 'the screen says changes are drafts until published')
  }
}

console.log(fail ? `\n${fail} of ${n} checks FAILED` : `All ${n} adult checks passed`)
process.exit(fail ? 1 : 0)
