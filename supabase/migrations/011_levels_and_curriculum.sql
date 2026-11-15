-- ASARTUN TECH BUILDER — Migration 011: lesson LEVELS by age, risk level, and curriculum chosen by each school / company
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-006 and 010. Safe to run twice.
-- 1) Every mission belongs to a LEVEL (age group) and has a RISK level. A child can only open lessons of a level
--    that matches their age band; HIGH-risk lessons need a known age.
-- 2) A school / company can choose exactly which lessons its learners see (its curriculum).
-- Both rules are enforced by the database, so a modified app cannot get around them.
-- Note: ages are self-reported by parents/children. For learners inside a school or company, ONLY the organization can change the age.

-- ============================== levels ==============================
create table if not exists public.lesson_levels (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name       jsonb not null default '{"ha":"","en":""}'::jsonb,
  min_age    smallint not null check (min_age between 3 and 18),
  max_age    smallint not null check (max_age between 3 and 18),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  check (max_age >= min_age)
);
insert into public.lesson_levels (slug, name, min_age, max_age, position) values
  ('level-1', '{"ha":"Matakin 1 · Ƙanana","en":"Level 1 · Younger"}', 5, 10, 1),
  ('level-2', '{"ha":"Matakin 2 · Matsakaita","en":"Level 2 · Middle"}', 11, 13, 2),
  ('level-3', '{"ha":"Matakin 3 · Manya","en":"Level 3 · Older"}', 14, 17, 3)
on conflict (slug) do nothing;

alter table public.missions add column if not exists level_id uuid references public.lesson_levels(id) on delete set null;
alter table public.missions add column if not exists risk_level text not null default 'low' check (risk_level in ('low','medium','high'));

-- First placement of the built-in 14 missions (only where no level was chosen yet). Admins can change it in Admin → Levels & safety.
update public.missions m set level_id = l.id, risk_level = v.risk
from (values
  ('cassava','level-1','medium'), ('potato','level-1','low'), ('waste','level-1','medium'), ('compost','level-1','low'),
  ('tailoring','level-1','low'), ('juice','level-1','medium'),
  ('solar','level-2','medium'), ('robot','level-2','medium'), ('device','level-2','medium'), ('pottery','level-2','medium'),
  ('poultry','level-2','medium'), ('bricks','level-2','medium'), ('bicycle','level-2','medium'),
  ('briquettes','level-3','high')) as v(slug, lvl, risk)
join public.lesson_levels l on l.slug = v.lvl
where m.slug = v.slug and m.level_id is null;

-- ============================== curriculum per organization ==============================
create table if not exists public.org_missions (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  primary key (org_id, mission_id)
);

alter table public.lesson_levels enable row level security;
alter table public.org_missions  enable row level security;
revoke insert, update, delete on public.lesson_levels from anon;
revoke all on public.org_missions from anon;
revoke insert, update, delete on public.org_missions from authenticated;   -- changed only through org_set_curriculum()

drop policy if exists "levels: public read" on public.lesson_levels;
create policy "levels: public read" on public.lesson_levels for select to anon, authenticated using (true);
drop policy if exists "levels: content manage" on public.lesson_levels;
create policy "levels: content manage" on public.lesson_levels for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));
drop policy if exists "org_missions: staff read" on public.org_missions;
create policy "org_missions: staff read" on public.org_missions for select to authenticated using (public.can_see_org(org_id));

drop trigger if exists audit_log on public.lesson_levels;
create trigger audit_log after insert or update or delete on public.lesson_levels for each row execute function public.log_admin_change();

-- ============================== rule helpers ==============================
-- internal: the upper age of a learner's band (null = no profile or no age)
create or replace function public.learner_age_cap(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case p.age_band when '5-7' then 7 when '8-10' then 10 when '11-13' then 13 when '14-17' then 17 end
  from public.profiles p where p.id = p_uid;
$$;

-- May this learner open lessons of this level?  Unknown age counts as "8-10" for low/medium risk and as "too young" for HIGH risk.
create or replace function public.age_ok(p_level uuid, p_risk text, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when p_risk = 'high' then coalesce(public.learner_age_cap(p_uid), 0) >= l.min_age
                               else coalesce(public.learner_age_cap(p_uid), 10) >= l.min_age end
                   from public.lesson_levels l where l.id = p_level), true);
$$;

-- Does this learner's school/company allow this lesson?  No active organization, or an organization with no chosen lessons = everything.
create or replace function public.in_curriculum(p_mission uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.learner_memberships lm join public.organizations o on o.id = lm.org_id and o.status = 'active' where lm.user_id = p_uid)
      or exists (select 1 from public.learner_memberships lm join public.organizations o on o.id = lm.org_id and o.status = 'active'
                 where lm.user_id = p_uid
                   and (not exists (select 1 from public.org_missions om where om.org_id = lm.org_id)
                        or exists (select 1 from public.org_missions om where om.org_id = lm.org_id and om.mission_id = p_mission)));
$$;

-- ============================== policies: what a learner can read ==============================
drop policy if exists "missions: public read live" on public.missions;
create policy "missions: public read live" on public.missions for select to anon, authenticated
  using (status in ('published','coming_soon') and public.in_curriculum(id, auth.uid()));

drop policy if exists "steps: public read published" on public.mission_steps;
create policy "steps: public read published" on public.mission_steps for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = mission_steps.mission_id and m.status = 'published'
                 and (m.access = 'free' or public.has_premium(auth.uid()))
                 and public.age_ok(m.level_id, m.risk_level, auth.uid())
                 and public.in_curriculum(m.id, auth.uid())));
drop policy if exists "questions: public read published" on public.game_questions;
create policy "questions: public read published" on public.game_questions for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = game_questions.mission_id and m.status = 'published'
                 and (m.access = 'free' or public.has_premium(auth.uid()))
                 and public.age_ok(m.level_id, m.risk_level, auth.uid())
                 and public.in_curriculum(m.id, auth.uid())));

create or replace function public.media_learner_readable(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_path is not null and (
    exists (select 1 from public.missions m where m.status = 'published' and m.cover_image_path = p_path and public.in_curriculum(m.id, auth.uid()))
    or exists (select 1 from public.mission_steps s join public.missions m on m.id = s.mission_id
               where m.status = 'published' and (m.access = 'free' or public.has_premium(auth.uid()))
                 and public.age_ok(m.level_id, m.risk_level, auth.uid()) and public.in_curriculum(m.id, auth.uid())
                 and position(p_path in s.content::text) > 0)
    or exists (select 1 from public.game_questions q join public.missions m on m.id = q.mission_id
               where m.status = 'published' and (m.access = 'free' or public.has_premium(auth.uid()))
                 and public.age_ok(m.level_id, m.risk_level, auth.uid()) and public.in_curriculum(m.id, auth.uid())
                 and position(p_path in q.media::text) > 0));
$$;

-- ============================== age: who may change it ==============================
-- A child cannot change the age while inside a school/company; only that organization can.
create or replace function public.ensure_my_profile(p_nickname text, p_age_band text default null)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_row public.profiles;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.profiles (id, nickname, age_band, last_active_at)
  values (v_uid, btrim(p_nickname), p_age_band, now())
  on conflict (id) do update
    set nickname = excluded.nickname,
        age_band = case when exists (select 1 from public.learner_memberships lm where lm.user_id = public.profiles.id)
                        then public.profiles.age_band
                        else coalesce(excluded.age_band, public.profiles.age_band) end,
        last_active_at = now()
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.my_age_band() returns text
language sql stable security definer set search_path = '' as $$
  select p.age_band from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.set_my_age_band(p_band text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'create a profile first' using errcode = 'P0001'; end if;
  if p_band not in ('5-7','8-10','11-13','14-17') then raise exception 'invalid age band' using errcode = '22023'; end if;
  if exists (select 1 from public.learner_memberships where user_id = auth.uid()) then
    raise exception 'your school or company sets your age' using errcode = '42501'; end if;
  update public.profiles set age_band = p_band where id = auth.uid();
end $$;

create or replace function public.org_set_learner_age(p_org uuid, p_user uuid, p_band text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_band not in ('5-7','8-10','11-13','14-17') then raise exception 'invalid age band' using errcode = '22023'; end if;
  if not exists (select 1 from public.learner_memberships where org_id = p_org and user_id = p_user) then
    raise exception 'this learner is not in your organization' using errcode = '42501'; end if;
  update public.profiles set age_band = p_band where id = p_user;
  perform public.log_view('set_age', 'profiles', p_user::text);
end $$;

-- ============================== curriculum functions ==============================
create or replace function public.org_curriculum(p_org uuid)
returns table (mission_id uuid, slug text, title jsonb, level_name jsonb, min_age integer, risk_level text, access text, selected boolean, mission_no integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select m.id, m.slug, m.title, l.name, l.min_age::integer, m.risk_level, m.access,
           exists (select 1 from public.org_missions om where om.org_id = p_org and om.mission_id = m.id), m.mission_no::integer
    from public.missions m left join public.lesson_levels l on l.id = m.level_id
    where m.status = 'published'
    order by l.position nulls last, m.mission_no;
end $$;

-- An empty list = no restriction (all lessons). A list = ONLY those lessons.
create or replace function public.org_set_curriculum(p_org uuid, p_slugs text[]) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  if not (public.is_super_admin() or public.is_org_member(p_org, array['org_admin'])) then
    raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.org_missions where org_id = p_org;
  insert into public.org_missions (org_id, mission_id)
    select p_org, m.id from public.missions m where m.status = 'published' and m.slug = any (coalesce(p_slugs, '{}'));
  get diagnostics v_n = row_count;
  perform public.log_view('set_curriculum', 'organizations', p_org::text);
  return v_n;
end $$;

-- ============================== privileges ==============================
revoke all on function
  public.learner_age_cap(uuid), public.age_ok(uuid, text, uuid), public.in_curriculum(uuid, uuid),
  public.my_age_band(), public.set_my_age_band(text), public.org_set_learner_age(uuid, uuid, text),
  public.org_curriculum(uuid), public.org_set_curriculum(uuid, text[])
from public, anon;
revoke all on function public.learner_age_cap(uuid) from authenticated;      -- internal only
grant execute on function public.age_ok(uuid, text, uuid), public.in_curriculum(uuid, uuid) to anon, authenticated;   -- used by the read policies
grant execute on function
  public.my_age_band(), public.set_my_age_band(text), public.org_set_learner_age(uuid, uuid, text),
  public.org_curriculum(uuid), public.org_set_curriculum(uuid, text[])
to authenticated;

-- Duplicating a mission now also copies its access (free/premium), level and risk
create or replace function public.duplicate_mission(p_id uuid, p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_new uuid; m public.missions;
begin
  if not public.has_admin_role(array['content_manager']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_slug !~ '^[a-z0-9-]+$' then raise exception 'slug may contain only a-z, 0-9 and -' using errcode = '22023'; end if;
  select * into m from public.missions where id = p_id;
  if not found then raise exception 'mission not found'; end if;
  insert into public.missions (slug, mission_no, emoji, title, description, category_id, age_min, age_max, difficulty,
      cover_image_path, status, stages, reward_rules, engine_options, estimated_minutes, objectives, access, level_id, risk_level)
  values (p_slug, (select coalesce(max(mission_no), 0) + 1 from public.missions), m.emoji,
      jsonb_build_object('ha', coalesce(m.title ->> 'ha', '') || ' (kwafi)', 'en', coalesce(m.title ->> 'en', '') || ' (copy)'),
      m.description, m.category_id, m.age_min, m.age_max, m.difficulty, m.cover_image_path, 'draft', m.stages,
      m.reward_rules, m.engine_options, m.estimated_minutes, m.objectives, m.access, m.level_id, m.risk_level)
  returning id into v_new;
  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content)
    select v_new, stage, step_type, step_key, position, content from public.mission_steps where mission_id = p_id;
  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points, media)
    select v_new, position, question, options, correct_index, explanation, points, media from public.game_questions where mission_id = p_id;
  return v_new;
end $$;
