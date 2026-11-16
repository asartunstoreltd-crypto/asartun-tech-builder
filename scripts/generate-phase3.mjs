// Generates supabase/migrations/016_phase3_content_drafts.sql. Run: node scripts/generate-phase3.mjs
//  * device-l2  : a DRAFT copy of the existing 'device' lesson plus the Level 2 science/design additions (the live 'device' is NOT touched)
//  * paper-l1, paper-l2 : Paper and Cardboard lessons (DRAFTS)
//  * skill tags (needs migration 015) for the Home Device and Paper lessons
// Everything is a draft: an admin reviews and edits in Admin -> Missions, then publishes.
import { writeFileSync } from 'node:fs'
import { paperL1 } from '../src/data/paperL1Mission.js'
import { paperL2 } from '../src/data/paperL2Mission.js'
import { deviceL2Extra as X } from '../src/data/deviceL2Extra.js'

const q = (s) => "'" + String(s).replaceAll("'", "''") + "'"
const j = (o) => '$j$' + JSON.stringify(o) + '$j$::jsonb'
const stepSql = (var_, stage, type, key, pos, body) =>
  `  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content) values (${var_}, ${q(stage)}, ${q(type)}, ${key ? q(key) : 'null'}, ${pos}, ${j(body)});`
const chType = (ch) => (ch.type === 'sort' || ch.type === 'safety' ? 'drag_drop' : ch.type === 'business' ? 'challenge' : 'simulation')

const contentInserts = (c) => {
  const out = []
  c.teach.forEach((p, i) => out.push(stepSql('v_id', 'teach', i === 0 ? 'story' : 'explanation', null, i, p)))
  Object.entries(c.steps).forEach(([k, s], i) => out.push(stepSql('v_id', 'demo', 'demonstration', k, i, s)))
  c.procedures.forEach((p, i) => out.push(stepSql('v_id', 'procedure', 'demonstration', p.id, i, p)))
  c.challenges.forEach((ch, i) => out.push(stepSql('v_id', 'challenge', chType(ch), ch.key, i, ch)))
  c.quiz.forEach((qq, i) => out.push(`  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points) values (v_id, ${i}, ${j(qq.q)}, ${j(qq.a)}, ${qq.c}, ${j(qq.e)}, ${Number(c.rewards.quiz) || 5});`))
  return out
}

const newMission = (c, slug, emoji, level, risk, diff, category) => [
  `do $d$\ndeclare v_id uuid;\nbegin`,
  `  if exists (select 1 from public.missions where slug = ${q(slug)}) then raise notice 'mission ${slug} already exists - skipping'; return; end if;`,
  `  insert into public.missions (slug, mission_no, emoji, title, description, category_id, difficulty, status, stages, reward_rules, engine_options, objectives, access, level_id, risk_level, family)`,
  `  values (${q(slug)}, (select coalesce(max(mission_no), 0) + 1 from public.missions), ${q(emoji)}, ${j(c.title)}, ${j(c.description)},`,
  `          (select id from public.categories where slug = ${q(category)}), ${q(diff)}, 'draft', ${j(c.stages)}, ${j(c.rewards)}, ${j({ header_title: c.title, mixed: true })}, ${j(c.objectives)},`,
  `          coalesce((select access from public.missions where slug = 'device'), 'free'), (select id from public.lesson_levels where slug = ${q(level)}), ${q(risk)}, 'paper-cardboard')`,
  `  returning id into v_id;`, ...contentInserts(c), `end $d$;\n`].join('\n')

const deviceL2 = [
  `do $d$`,
  `declare v_old uuid; v_id uuid; v_n integer; v_c integer; v_q integer;`,
  `begin`,
  `  if exists (select 1 from public.missions where slug = 'device-l2') then raise notice 'mission device-l2 already exists - skipping'; return; end if;`,
  `  select id into v_old from public.missions where slug = 'device';`,
  `  if v_old is null then raise notice 'mission device not found - skipping'; return; end if;`,
  `  insert into public.missions (slug, mission_no, emoji, title, description, category_id, difficulty, status, stages, reward_rules, engine_options, objectives, access, level_id, risk_level, family, cover_image_path)`,
  `  select 'device-l2', (select coalesce(max(mission_no), 0) + 1 from public.missions), m.emoji, m.title, m.description, m.category_id, 'intermediate', 'draft', m.stages,`,
  `         m.reward_rules || ${j(X.rewards)}, m.engine_options, ${j(X.objectives)}, m.access, (select id from public.lesson_levels where slug = 'level-2'), 'medium', 'home-device', m.cover_image_path`,
  `    from public.missions m where m.id = v_old`,
  `  returning id into v_id;`,
  `  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content)`,
  `    select v_id, stage, step_type, step_key, position, content from public.mission_steps where mission_id = v_old;`,
  `  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points, media)`,
  `    select v_id, position, question, options, correct_index, explanation, points, media from public.game_questions where mission_id = v_old;`,
  `  select count(*) into v_n from public.mission_steps where mission_id = v_id and stage = 'teach';`,
  `  select count(*) into v_c from public.mission_steps where mission_id = v_id and stage = 'challenge';`,
  `  select count(*) into v_q from public.game_questions where mission_id = v_id;`,
  `  -- the science pages go BEFORE the last existing teaching page ("Inventions add value")`,
  `  update public.mission_steps set position = position + ${X.teach.length} where mission_id = v_id and stage = 'teach' and position = v_n - 1;`,
  ...X.teach.map((p, i) => `  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content) values (v_id, 'teach', 'explanation', null, v_n - 1 + ${i}, ${j(p)});`),
  ...X.challenges.map((ch, i) => `  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content) values (v_id, 'challenge', ${q(chType(ch))}, ${q(ch.key)}, v_c + ${i}, ${j(ch)});`),
  ...X.quiz.map((qq, i) => `  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points) values (v_id, v_q + ${i}, ${j(qq.q)}, ${j(qq.a)}, ${qq.c}, ${j(qq.e)}, 5);`),
  `end $d$;\n`].join('\n')

const tags = (slug, list) => `insert into public.mission_competencies (mission_id, competency)\n  select m.id, c from public.missions m, unnest(array[${list.map(q).join(', ')}]) as c where m.slug = ${q(slug)}\n  on conflict do nothing;`

const sql = [
  '-- GENERATED by scripts/generate-phase3.mjs. Do not edit by hand.',
  '-- Needs 001-006, 010, 011, 013, 014 and 015. Safe to run twice (anything that exists is skipped).',
  '-- Adds DRAFT lessons only: device-l2 (copy of device + science/design additions), paper-l1, paper-l2. The live lessons are not changed.',
  '-- An admin must review the science and Hausa text, then publish. When device-l2 is published it automatically replaces device on the',
  '-- dashboard (same family and level, newer lesson wins); archive the old device lesson afterwards. Points already earned are kept; the new',
  '-- lesson has its own progress keys, so learners can earn its points once.\n',
  deviceL2, newMission(paperL1, 'paper-l1', '📄', 'level-1', 'low', 'beginner', 'environment'), newMission(paperL2, 'paper-l2', '📦', 'level-2', 'low', 'intermediate', 'environment'),
  '-- skills each lesson builds (shown to teachers)',
  tags('device-l2', X.competencies), tags('device-l1', ['materials', 'processes']), tags('device-l3', ['science', 'design', 'testing', 'business', 'presenting', 'problem-solving']),
  tags('paper-l1', ['materials', 'processes']), tags('paper-l2', ['materials', 'science', 'design', 'business', 'presenting']),
].join('\n')
writeFileSync(new URL('../supabase/migrations/016_phase3_content_drafts.sql', import.meta.url), sql + '\n')
console.log('Wrote 016_phase3_content_drafts.sql', sql.length, 'characters')
