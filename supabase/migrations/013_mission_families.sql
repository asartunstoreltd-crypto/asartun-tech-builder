-- ASARTUN TECH BUILDER — Migration 013: mission FAMILIES (one topic, one lesson per level)
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-006, 010, 011.  Safe to run twice.
-- A family is just a shared name (e.g. 'home-device'). Give the Level 1, Level 2 and Level 3 versions of a topic the same
-- family. The learner app then shows each child only the highest version their age allows. Age locks, school curriculum,
-- reward rules and progress keys keep working per mission row, exactly as before. No existing mission is changed.

alter table public.missions add column if not exists family text check (family ~ '^[a-z0-9-]+$');
create index if not exists missions_family_idx on public.missions (family) where family is not null;

-- Duplicating a mission also copies its family (this is how an admin starts the next level's version).
create or replace function public.duplicate_mission(p_id uuid, p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_new uuid; m public.missions;
begin
  if not public.has_admin_role(array['content_manager']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_slug !~ '^[a-z0-9-]+$' then raise exception 'slug may contain only a-z, 0-9 and -' using errcode = '22023'; end if;
  select * into m from public.missions where id = p_id;
  if not found then raise exception 'mission not found'; end if;
  insert into public.missions (slug, mission_no, emoji, title, description, category_id, age_min, age_max, difficulty,
      cover_image_path, status, stages, reward_rules, engine_options, estimated_minutes, objectives, access, level_id, risk_level, family)
  values (p_slug, (select coalesce(max(mission_no), 0) + 1 from public.missions), m.emoji,
      jsonb_build_object('ha', coalesce(m.title ->> 'ha', '') || ' (kwafi)', 'en', coalesce(m.title ->> 'en', '') || ' (copy)'),
      m.description, m.category_id, m.age_min, m.age_max, m.difficulty, m.cover_image_path, 'draft', m.stages,
      m.reward_rules, m.engine_options, m.estimated_minutes, m.objectives, m.access, m.level_id, m.risk_level, m.family)
  returning id into v_new;
  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content)
    select v_new, stage, step_type, step_key, position, content from public.mission_steps where mission_id = p_id;
  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points, media)
    select v_new, position, question, options, correct_index, explanation, points, media from public.game_questions where mission_id = p_id;
  return v_new;
end $$;
