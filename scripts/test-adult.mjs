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
import { LITERACY_START } from '../src/adult/assessment.js'

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
const sql = readdirSync(sqlDir).filter((f) => /^01[789]_adult/.test(f)).map((f) => readFileSync(join(sqlDir, f), 'utf8')).join('\n')
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
  const sent = (lessons.match(/results: \{ ([^}]*) \}/) || [])[1] || ''
  const keysSent = [...sent.matchAll(/(\w+):/g)].map((m) => m[1]).sort()
  eq(keysSent, ['find', 'match', 'steps', 'traceTries', 'trace', 'write'].sort(), 'lesson result keys sent by the app')
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

console.log(fail ? `\n${fail} of ${n} checks FAILED` : `All ${n} adult checks passed`)
process.exit(fail ? 1 : 0)
