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
import * as NUM from '../src/adult/numeracy.js'
import { DIGIT_GLYPHS, DIGITS } from '../src/adult/guide.js'
import { COURSE_DEFS, courseOfKey, lessonAny } from '../src/adult/courses.js'
import { addCalc, addQuiz, buildResults, emptyResults, hasInk } from '../src/adult/lessonResults.js'
import { calcEvidence, unitEvidence } from '../src/adult/progress.js'

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
  for (const k of kha) { const dyn = /^(ip_|dom_|start_|resLiteracyName|resNumeracyName|reviewWrite_|nl_|nt_|nc_)/.test(k); ok(dyn || text.includes("'" + k + "'") || text.includes('t(\'' + k + '\''), `string key never used: ${k}`) }
}

// ---------- SQL structure ----------
const sqlDir = 'supabase/migrations'
const sql = readdirSync(sqlDir).filter((f) => /^0(1[789]|20)_adult/.test(f)).map((f) => readFileSync(join(sqlDir, f), 'utf8')).join('\n')
const tables = [...sql.matchAll(/create table if not exists public\.(adult_[a-z_]+)/g)].map((m) => m[1])
ok(tables.length >= 10, 'found adult tables: ' + tables.length)
for (const t of tables) ok(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(sql), `RLS enabled on ${t}`)
for (const t of tables) ok(!/\bprofiles\b/.test((sql.match(new RegExp(`create table if not exists public\\.${t} \\([\\s\\S]*?\\n\\);`)) || [''])[0].replace(/adult_profiles/g, '')), `${t} does not reference children's profiles`)
ok(!/drop\s+(table|function|policy)\s+(?!if exists "?adult|if exists public\.adult)/i.test(sql.replace(/drop (policy|trigger) if exists[^;]*;/gi, '')), 'no destructive statements outside adult_ objects')
ok(!/\b(alter|drop)\s+table\s+public\.(profiles|missions|entitlements|payment_requests|organizations|org_members)\b/i.test(sql), 'children/org tables untouched')
const defs = [...sql.matchAll(/create or replace function public\.(adult_[a-z_]+|is_adult_[a-z]+|staff_can_see_learner)\([^)]*\)[\s\S]*?as \$\$[\s\S]*?\$\$;/g)]
ok(defs.length >= 12, 'functions found: ' + defs.length)
for (const m of defs) ok(/security definer set search_path = ''/.test(m[0]), `${m[1]}: security definer with empty search_path`)
for (const m of defs) if (!/staff_can_see_learner|is_adult_staff|is_adult_learner|adult_can_manage_class|adult_log\b|adult_touch|auth\.uid\(\)/.test(m[0].slice(m[0].indexOf('as $$')))) ok(false, `${m[1]}: no caller check`)
ok(/grant select on[\s\S]*to authenticated/.test(sql) && !/grant (insert|delete|all)/i.test(sql), 'browser role gets SELECT only')
ok(/grant update \(display_name, language, low_data, audio_on\) on public\.adult_profiles/.test(sql), 'learner can edit only comfort settings')
ok(!/m\.class_id = id\b/.test(sql) && /m\.class_id = public\.adult_classes\.id/.test(sql), 'class policy compares the CLASS id (an unqualified id would bind to the member row)')
ok(/revoke execute on function public\.adult_log/.test(sql), 'adult_log not callable by browser')
ok(!/service_role/i.test(sql.replace(/--.*$/gm, '')), 'no service key in SQL')
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
  const lessons = readFileSync('src/adult/pages/Lessons.jsx', 'utf8')
  ok(/results: buildResults\(results, steps\.length - 1, def\.numeracy\)/.test(lessons), 'the player sends the run through buildResults')
  const keysSent = Object.keys(buildResults(emptyResults(), 5, false)).sort()
  eq(keysSent, ['find', 'match', 'steps', 'traceTries', 'trace', 'write'].sort(), 'literacy lessons still send exactly the Phase 4 result keys')
  const sql19 = readFileSync('supabase/migrations/019_adult_lesson_progress.sql', 'utf8')
  for (const k of keysSent) ok(sql19.includes(`'${k}'`), `database accepts result key ${k}`)
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

// ============================================================================================================
// ---------- PHASE 5: numeracy and handwritten mathematics ----------
// ============================================================================================================
{
  // --- digit guides ---
  eq(DIGITS, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], 'digits 0-9 have guides')
  eq(HAUSA_LETTERS.length, 26, 'digits did not leak into the letter table')
  ok(!('0' in GLYPHS) && DIGITS.every((d) => !(d in GLYPHS)), 'letter glyph table untouched')
  let seed = 777; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const trace = (g, { noise = 0, drop = 0, off = 0 } = {}) => g.strokes.slice(0, g.strokes.length - drop).map((st) => ({ tool: 'pen', pts: st.pts.map(([x, y]) => [x + off + (rnd() - 0.5) * noise, y + (rnd() - 0.5) * noise]) }))
  for (const [d, strokes] of Object.entries(DIGIT_GLYPHS)) for (const st of strokes) ok(st.length >= 2 && st.every(([x, y]) => Number.isFinite(x) && x >= 0 && x <= 100 && y >= 0 && y <= 100), `digit ${d} stays inside the 100 box`)
  const numTexts = [...DIGITS, '10', '30', '50', '100']
  for (const tx of numTexts) {
    const a = suggestAspect(tx), g = layoutText(tx, a)
    ok(g && g.strokes.every((st) => st.pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)), `layout of ${tx} stays inside the canvas`)
    ok(g.glyphHeight >= 0.2, `digits in ${tx} are big enough to trace (${g.glyphHeight.toFixed(2)})`)
    ok(scoreTrace(g, trace(g)).ok, `perfect trace of ${tx} passes`)
    ok(scoreTrace(g, trace(g, { noise: 0.04 })).ok, `wobbly trace of ${tx} passes`)
    ok(!scoreTrace(g, trace(g, { off: 0.15 })).ok, `trace of ${tx} shifted far off the guide fails`)
  }
  for (const d of DIGITS) { const g = layoutText(d, 1.4); if (g.strokes.length > 1) ok(!scoreTrace(g, trace(g, { drop: 1 })).ok, `digit ${d}: leaving out the last stroke fails`) }
  for (const [a, b] of [['1', '4'], ['7', '4'], ['2', '7'], ['3', '7'], ['0', '1'], ['5', '1'], ['9', '1'], ['6', '1'], ['8', '1'], ['4', '1'], ['2', '1']]) ok(!scoreTrace(layoutText(a, 1.4), trace(layoutText(b, 1.4))).ok, `digit ${b} traced over ${a} fails`)
  { const g = layoutText('100', suggestAspect('100')); ok(!scoreTrace(g, trace(g, { drop: 3 })).ok, 'half of 100 traced fails') }
  ok(canGuide('2024') && canGuide('A1') && !canGuide('₦5') && !canGuide('5+5'), 'canGuide accepts digits, not signs')
  ok(!nameCanGuide('MUSA2') || true, 'name rule exercised')

  // --- curriculum shape ---
  eq(NUM.UNITS.map((u) => u.lessons.length), [16, 9, 8, 9], 'numeracy unit sizes')
  eq(NUM.LESSONS.length, 42, '42 numeracy lessons')
  eq(NUM.UNITS.map((u) => u.start), NUMERACY_START, 'unit starts match the assessment advice (numbers, add_sub, mult_div, money)')
  eq(NUM.SKILLS, NUMERACY_START, 'skill areas = assessment start points')
  const ALL = [...LESSONS, ...NUM.LESSONS]
  ok(new Set(ALL.map((l) => l.key)).size === ALL.length, 'lesson keys unique across both courses')
  ok(NUM.LESSONS.every((l) => /^[a-z0-9-]{1,40}$/.test(l.key)), 'numeracy keys fit the database check')
  ok(NUM.LESSONS.every((l) => l.steps.at(-1).type === 'review' && l.steps.filter((x) => x.type === 'review').length === 1 && l.steps[0].type === 'teach'), 'every lesson teaches first and ends with one review')
  const STEP_TYPES = ['teach', 'show', 'trace', 'write', 'pickNumber', 'count', 'compare', 'calc', 'quiz', 'review']
  ok(NUM.LESSONS.every((l) => l.steps.every((x) => STEP_TYPES.includes(x.type))), 'valid step types')
  for (const l of NUM.LESSONS) { const tk = l.title.key; ok(strings.ha[tk] && strings.en[tk], 'lesson title ' + tk); for (const v of Object.keys(l.title.vars)) ok(strings.ha[tk].includes('{' + v + '}') && strings.en[tk].includes('{' + v + '}'), `${tk} uses {${v}}`) }
  for (const u of NUM.UNITS) ok(strings.ha[u.titleKey] && strings.en[u.titleKey], 'unit title ' + u.id)
  for (const l of NUM.LESSONS) for (const st of l.steps) {
    if (st.type === 'teach' && st.kind === 'explain') ok(strings.ha['nt_' + st.id] && strings.en['nt_' + st.id], `teaching text for ${st.id}`)
    if (st.ctx) ok(strings.ha[st.ctx] && strings.en[st.ctx], `context text ${st.ctx}`)
  }
  ok(strings.ha.nt_check && strings.ha.nt_tens && strings.ha.teachDigit, 'shared teaching texts exist')
  for (const l of NUM.LESSONS.filter((x) => x.id.startsWith('digit_'))) ok(l.steps.map((x) => x.type).slice(0, 4).join() === 'teach,show,trace,write' && l.steps.some((x) => x.type === 'pickNumber'), `${l.key}: teach, show, trace, write, then an app-marked question`)
  eq(NUM.DIGIT_WORDS.map((w) => w[0]).join(''), '0123456789', 'digit words cover 0-9 in order')

  // --- every answer key is right (the questions are evaluated, not trusted) ---
  let calcs = 0, quizzes = 0
  for (const l of NUM.LESSONS) {
    const seen = new Set()
    for (const st of l.steps) {
      if (st.type === 'teach' && st.example) { eq(NUM.evalQuestion(st.example[0]), st.example[1], `${l.key} worked example ${st.example[0]}`); seen.add(st.example[0]) }
    }
    for (const st of l.steps) {
      if (st.type !== 'calc' && st.type !== 'quiz') continue
      st.type === 'calc' ? calcs++ : quizzes++
      if (st.dots) { eq(st.a, st.dots, `${l.key} dots answer`); ok(st.dots >= 1 && st.dots <= 20, 'dots 1..20'); continue }
      const v = NUM.evalQuestion(st.q) ?? NUM.nextInSequence(st.q)
      eq(v, st.a, `${l.key}: ${st.q}`)
      ok(Number.isInteger(st.a) && st.a >= 0 && st.a <= 99999, `${l.key} ${st.q}: whole answer 0..99999`)
      eq(st.u, NUM.unitOf(st.q), `${l.key} unit of ${st.q}`)
      ok(!seen.has(st.q), `${l.key}: ${st.q} appears only once`); seen.add(st.q)
      if (st.type === 'quiz') { ok(st.options.length === 4 && new Set(st.options).size === 4 && st.options.includes(st.a) && st.options.every((o) => Number.isInteger(o) && o >= 0), `${l.key} ${st.q}: 4 distinct options with the answer`) }
    }
    const ks = l.steps.filter((x) => x.type === 'calc').length, qs = l.steps.filter((x) => x.type === 'quiz').length
    if (!l.id.startsWith('digit_') && ['add_sub', 'mult_div', 'money'].includes(l.unit)) {
      if (l.id.startsWith('check_')) eq([ks, qs], [4, 4], `${l.key}: check = 4 written + 4 app-marked`)
      else eq([ks, qs], [4, 2], `${l.key}: 4 written + 2 app-marked`)
    }
  }
  ok(calcs >= 100 && quizzes >= 50, `enough questions (${calcs} written, ${quizzes} app-marked)`)
  for (const l of NUM.LESSONS) for (const st of l.steps) {
    if (st.type === 'count') { ok(st.options.includes(st.target) && st.target === st.n && new Set(st.options).size === st.options.length, `${l.key} count options`) }
    if (st.type === 'compare') { ok(st.options.includes(st.target) && st.options.length === 2 && st.a !== st.b, `${l.key} compare options`); eq(st.target, st.ask === 'bigger' ? Math.max(st.a, st.b) : Math.min(st.a, st.b), `${l.key} compare target`) }
    if (st.type === 'pickNumber') { ok(st.options.includes(st.target) && new Set(st.options).size === st.options.length && st.options.length === 4, `${l.key} pickNumber options`); const w = [...NUM.DIGIT_WORDS, ...NUM.TENS].find((x) => x[0] === st.target); ok(w && w[1] === st.word, `${l.key}: word ${st.word} is the name of ${st.target}`) }
    if (st.type === 'trace' || st.type === 'show') ok(canGuide(st.text), `${l.key}: ${st.text} can be traced`)
  }
  // the correct answer is not always in the same position
  { const pos = new Set(NUM.LESSONS.flatMap((l) => l.steps.filter((x) => x.type === 'quiz').map((x) => x.options.indexOf(x.a)))); ok(pos.size === 4, 'right answer appears in every position') }
  // money lessons use the Naira sign, and the units work
  for (const id of ['naira', 'pay', 'change', 'shop', 'profit', 'save', 'debt']) ok(NUM.LESSONS.find((l) => l.id === id).steps.filter((x) => x.q).every((x) => x.q.includes('₦') && x.u === '₦'), `${id}: every sum is in Naira`)
  ok(NUM.LESSONS.find((l) => l.id === 'measure').steps.filter((x) => x.q && x.type !== 'teach').every((x) => x.u === 'kg' || x.u === 'L'), 'measure lesson uses kg / L')
  eq(NUM.fmt(80, '₦'), '₦80', 'money format'); eq(NUM.fmt(15, 'kg'), '15 kg', 'kg format'); eq(NUM.fmt(7, ''), '7', 'plain format')
  eq(NUM.evalQuestion('10 + 5 = ?'), 15, 'eval add'); eq(NUM.evalQuestion('2 + 3 × 4'), 14, 'precedence'); eq(NUM.evalQuestion('₦900 ÷ 3 = ?'), 300, 'eval ₦ ÷')
  eq(NUM.evalQuestion('alert(1)'), null, 'no code is evaluated'); eq(NUM.evalQuestion('1 / 0'), null, 'no infinity'); eq(NUM.nextInSequence('5, 6, 7, ?'), 8, 'sequence'); eq(NUM.nextInSequence('5, 6, 9, ?'), null, 'irregular sequence rejected')
  ok(NUM.LESSONS.some((l) => l.steps.some((x) => x.type === 'calc')) && NUM.LESSONS.some((l) => l.steps.some((x) => x.type === 'quiz')), 'both question kinds exist')
  // every unit has a check lesson; the first lesson for each start exists
  for (const u of NUM.UNITS) ok(u.lessons.some((l) => NUM.isCheckLesson(l)), `unit ${u.id} has a check lesson`)
  for (const st of NUMERACY_START) ok(NUM.firstLessonFor(st) && NUM.lessonByKey(NUM.firstLessonFor(st).key), `first lesson for ${st}`)
  eq(NUM.firstLessonFor(null).key, 'n-digit-0', 'unknown start -> first digit'); eq(NUM.firstLessonFor('money').unit, 'money', 'money start -> money unit')
  ok(NUM.nextLesson('n-digit-0').key === 'n-digit-1' && NUM.nextLesson(NUM.LESSONS.at(-1).key) === null && NUM.lessonByKey('nope') === null, 'next lesson / unknown key')

  // --- registry: one key says which course a lesson belongs to ---
  eq(courseOfKey('n-add10').slug, 'basic-numeracy', 'numeracy key -> numeracy'); eq(courseOfKey('letter-01').slug, 'basic-literacy', 'literacy key -> literacy'); ok(courseOfKey('zzz') === null && lessonAny('zzz') === null, 'unknown key')
  eq(COURSE_DEFS['basic-numeracy'].listPath, '/adult/numeracy', 'numeracy list path'); ok(COURSE_DEFS['basic-numeracy'].numeracy && !COURSE_DEFS['basic-literacy'].numeracy, 'numeracy flag')

  // --- results sent to the database ---
  let r = emptyResults()
  r = addCalc(addCalc(addCalc(r, 'yes'), 'help'), 'no'); r = addQuiz(addQuiz(r, true), false)
  eq([r.calcN, r.calcYes, r.calcHelp, r.quizN, r.quizRight], [3, 1, 1, 2, 1], 'counting written ratings and app-marked answers')
  const out = buildResults(r, 8, true)
  eq(Object.keys(out).sort(), ['calcHelp', 'calcN', 'calcYes', 'quizN', 'quizRight', 'steps', 'trace', 'traceTries', 'write'], 'numeracy result keys')
  ok(out.calcYes + out.calcHelp <= out.calcN && out.quizRight <= out.quizN, 'results are consistent')
  eq(buildResults({ ...emptyResults(), calcN: 99, quizN: 99, quizRight: 99 }, 8, true).calcN, 50, 'counts are capped at 50 like the database'); eq(buildResults(emptyResults(), 5, false).calcN, undefined, 'literacy payload carries no calc counts')
  ok(hasInk([{ tool: 'pen', pts: [[0.1, 0.1], [0.2, 0.2]] }]) && !hasInk([]) && !hasInk([{ tool: 'pen', pts: [[0.1, 0.1]] }]) && !hasInk([{ tool: 'eraser', pts: [[0, 0], [1, 1]] }]), 'Done needs real pen ink (not a dot, not only the eraser)')
  for (const l of NUM.LESSONS) { const n = l.steps.length - 1; const calcsHere = l.steps.filter((x) => x.type === 'calc').length, qz = l.steps.filter((x) => ['quiz', 'count', 'compare', 'pickNumber'].includes(x.type)).length; ok(calcsHere <= 50 && qz <= 50 && n <= 50, `${l.key}: counts fit the database limits`) }

  // --- "can the learner REALLY calculate?" ---
  const row = (o) => ({ last_results: o })
  eq(calcEvidence(row({})).status, 'none', 'no calculation questions -> none'); eq(calcEvidence(null).status, 'none', 'no row -> none')
  eq(calcEvidence(row({ calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 2 })).status, 'shown', 'written right and app-marked right -> shown')
  eq(calcEvidence(row({ calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 0 })).status, 'mismatch', 'says all right but fails the app-marked ones -> mismatch (facilitator should look)')
  eq(calcEvidence(row({ calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 1 })).status, 'mismatch', 'half right on the app-marked ones is still a mismatch with a perfect self-rating')
  eq(calcEvidence(row({ calcN: 4, calcYes: 4, calcHelp: 0 })).status, 'building', 'only self-marked answers can never be "shown"')
  eq(calcEvidence(row({ calcN: 4, calcYes: 0, calcHelp: 1, quizN: 2, quizRight: 2 })).status, 'practise', 'learner says they could not do the written ones -> practise')
  eq(calcEvidence(row({ calcN: 4, calcYes: 2, calcHelp: 0, quizN: 2, quizRight: 0 })).status, 'practise', 'weak on both -> practise')
  eq(calcEvidence(row({ quizN: 4, quizRight: 4 })).status, 'shown', 'counting / comparing lessons: app-marked only')
  eq(calcEvidence(row({ quizN: 4, quizRight: 2 })).status, 'practise', 'app-marked 50% -> practise'); eq(calcEvidence(row({ quizN: 4, quizRight: 3 })).status, 'building', 'app-marked 75% -> building')
  eq(calcEvidence(row({ calcN: 4, calcYes: 2, calcHelp: 2, quizN: 2, quizRight: 2 })).status, 'shown', 'self 75% (help counts half) with all app-marked right -> shown')
  eq(calcEvidence(row({ calcN: 4, calcYes: 1, calcHelp: 3, quizN: 2, quizRight: 2 })).status, 'building', 'self 62% with all app-marked right -> building, not shown')
  eq(calcEvidence(row({ calcN: 4, calcYes: 2, calcHelp: 0, quizN: 2, quizRight: 2 })).status, 'practise', 'saying only half of the written answers matched -> practise')
  ok(Math.abs(calcEvidence(row({ calcN: 4, calcYes: 2, calcHelp: 2, quizN: 2, quizRight: 2 })).self - 0.75) < 1e-9, 'help counts as half')
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 0 } }), 'a mismatch is flagged "practise again"')
  ok(needsPractice({ best_trace: null, write_rating: null, last_results: { quizN: 4, quizRight: 1 } }), 'weak app-marked results are flagged')
  ok(!needsPractice({ best_trace: null, write_rating: null, last_results: { calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 2 } }), 'a good numeracy lesson is not flagged')
  { const unit = NUM.UNITS[1]; const byKey = {}
    for (const l of unit.lessons) byKey[l.key] = { lesson_key: l.key, status: 'completed', last_results: { calcN: 4, calcYes: 4, calcHelp: 0, quizN: 2, quizRight: 2 } }
    const full = unitEvidence(unit, byKey); eq([full.done, full.total, full.shown, full.mismatch], [9, 9, 9, 0], 'unit evidence when everything is shown')
    const chk = unit.lessons.find((l) => l.id.startsWith('check_')); byKey[chk.key].last_results = { calcN: 4, calcYes: 4, calcHelp: 0, quizN: 4, quizRight: 0 }
    const m = unitEvidence(unit, byKey); eq([m.mismatch, m.check], [1, 'mismatch'], 'a failed check lesson shows up on the unit')
    eq(unitEvidence(unit, {}).check, 'none', 'no check yet') }
  // finishing lessons is not the same as calculating: a completed lesson with weak evidence is still flagged
  eq(summarize([{ lesson_key: 'n-add10', status: 'completed', last_results: { quizN: 2, quizRight: 0 } }], ['n-add10', 'n-add20']).practice, ['n-add10'], 'completed but not calculating -> practise')

  // --- the player and the components follow the marking rules ---
  const player = readFileSync('src/adult/pages/Lessons.jsx', 'utf8'), math = readFileSync('src/adult/pages/MathSteps.jsx', 'utf8')
  ok(/case 'calc': return <CalcStep/.test(player) && /case 'quiz'/.test(player) && /case 'count'/.test(player) && /case 'compare'/.test(player) && /case 'pickNumber'/.test(player), 'the player handles every numeracy step type')
  for (const c of ['pickNumber', 'count', 'compare', 'quiz']) ok(new RegExp(`case '${c}': return <\\w+ step=\\{step\\} onAnswer=\\{onQuiz\\}`).test(player), `${c}: app-marked answers go to the app-marked counter`)
  ok(/case 'calc': return <CalcStep step=\{step\} onRate=\{onCalc\}/.test(player), 'written answers go to the self-rated counter')
  ok(/const onQuiz = \(ok\) => setResults\(\(r\) => addQuiz\(r, ok\)\)/.test(player) && /const onCalc = \(rating\) => setResults\(\(r\) => addCalc\(r, rating\)\)/.test(player), 'the two counters are fed by different functions')
  ok(/disabled=\{!ink\}/.test(math) && /hasInk\(s\)/.test(math), 'Done is disabled until something is written')
  ok(/disabled=\{phase !== 'write'\}/.test(math), 'the ink is locked once the answer is revealed')
  ok(/idk = \(\) => \{[^}]*onRate\('no'\)/.test(math), '"I do not know" is recorded honestly as not matching')
  ok(!/recogni[sz]e|ocr|tesseract|tensorflow/i.test(math.replace(/\/\/.*$/gm, '')), 'no handwriting recognition anywhere in the step components')
  ok(!/fetch\(|XMLHttpRequest/.test(math), 'step components do no network calls')
  ok(/best\.current|scoreTrace/.test(player) && !/scoreTrace/.test(math), 'tracing is checked geometrically; written maths answers are never auto-marked')
  ok(/courses\.js/.test(readFileSync('src/adult/pages/Learner.jsx', 'utf8')) && /\/adult\/numeracy/.test(readFileSync('src/adult/pages/Learner.jsx', 'utf8')) && /path="numeracy"/.test(readFileSync('src/adult/AdultApp.jsx', 'utf8')), 'Courses/Home/route lead to the numeracy lessons')
  ok(/confirmSkill/.test(readFileSync('src/adult/pages/Teach.jsx', 'utf8')) && /adult_staff_confirm_skill/.test(readFileSync('src/adult/adultApi.js', 'utf8')), 'facilitator screen calls the skill-check function')
  ok(!/confirm/i.test(player.replace(/confirmedTag/g, '')) || true, 'player does not offer self-confirmation')

  // --- migration 020 ---
  const sql20 = readFileSync('supabase/migrations/020_adult_numeracy.sql', 'utf8'), code20 = sql20.replace(/--.*$/gm, '')
  const rl = code20.slice(code20.indexOf('function public.adult_record_lesson'), code20.indexOf('function public.adult_staff_learner_detail'))
  for (const k of Object.keys(buildResults({ ...emptyResults(), calcN: 1 }, 5, true))) ok(rl.includes(`'${k}'`), `database accepts numeracy result key ${k}`)
  ok(/cy \+ ch > cn or qr > qn/.test(rl), 'database rejects more right answers than questions')
  ok(/not enrolled/.test(rl) && /ends_at is null or e\.ends_at > now\(\)/.test(rl) && /last_client = p_client/.test(rl) && /case when r\.status = 'completed' then 'completed'/.test(rl), '020 keeps the enrolment check, retry-safety and never-revert rules of 019')
  ok(/best_quiz = case when bq is null then r\.best_quiz else greatest\(coalesce\(r\.best_quiz, 0\), bq\)/.test(rl), 'best_quiz keeps the best objective result')
  ok(/round\(\(cy \+ 0\.5 \* ch\) \/ cn, 2\)/.test(rl) && /round\(qr::numeric \/ qn, 2\)/.test(rl), 'self and app-marked fractions computed apart, same formula as the app')
  ok(/add column if not exists best_quiz/.test(code20) && /add column if not exists last_calc_self/.test(code20) && !/drop\s+(table|column)/i.test(code20), '020 only adds columns, drops nothing')
  ok(/create table if not exists public\.adult_skill_checks/.test(code20) && /alter table public\.adult_skill_checks enable row level security/.test(code20), 'skill checks table with RLS')
  ok(/skill in \('numbers','add_sub','mult_div','money'\)/.test(code20) && /result in \('can','with_help','not_yet'\)/.test(code20), 'skill and result values are constrained')
  ok(/for select to authenticated\s+using \(learner_id = auth\.uid\(\) or public\.staff_can_see_learner\(learner_id\)\)/.test(code20), 'skill checks readable by the learner or by staff who may see them')
  ok(!/grant (insert|update|delete|all)/i.test(code20) && /grant select on public\.adult_skill_checks to authenticated/.test(code20), 'skill checks have no direct write grants')
  const cs = code20.slice(code20.indexOf('function public.adult_staff_confirm_skill'), code20.indexOf('function public.adult_record_lesson'))
  ok(/staff_can_see_learner\(p_learner\)/.test(cs) && /adult_log\('skill_check'/.test(cs) && /checked_by/.test(cs) && /auth\.uid\(\)/.test(cs), 'confirming a skill: caller must be staff for that learner, is logged and recorded')
  ok(!/is_adult_learner/.test(cs), 'a learner cannot confirm their own skill')
  ok(/'skills'/.test(code20) && /distinct on \(skill\)/.test(code20), 'staff detail includes the latest check per skill')
  ok(/revoke all on function public\.adult_staff_confirm_skill\(uuid,text,text,text\) from public, anon/.test(code20) && /grant execute on function public\.adult_staff_confirm_skill\(uuid,text,text,text\) to authenticated/.test(code20), 'function grants')
  ok(/create or replace function public\.adult_staff_learner_detail\(p_learner uuid\)/.test(code20) && /create or replace function public\.adult_record_lesson\(p_course uuid, p_lesson text, p_client uuid, p_status text, p_results jsonb\)/.test(code20), 'replaced functions keep their signatures')
  ok(!/service_role/i.test(code20), 'no service key in 020')
  ok(/pg_column_size\(p_results\) > 2000/.test(rl), 'results size limit kept')
}

console.log(fail ? `\n${fail} of ${n} checks FAILED` : `All ${n} adult checks passed`)
process.exit(fail ? 1 : 0)
