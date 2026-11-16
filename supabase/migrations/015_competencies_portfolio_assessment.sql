-- ASARTUN TECH BUILDER — Migration 015: competencies, learner portfolio, teacher assessment
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-006, 010, 011, 012 (and 013 if used).  Safe to run twice.
--
-- What this adds
--   competencies          8 skills a lesson can build (identify materials, explain science, design, test, ...)
--   mission_competencies  which skills each lesson builds (set by content managers)
--   portfolio_entries     a child's own work from reflect / prediction / simulation / business-plan activities
--   teacher_assessments   a teacher's 1-4 score (+ short comment) for one skill of one learner in THEIR school
--
-- Rules (all enforced here in the database, never only in the app)
--   * A child writes only their own portfolio, only through save_portfolio_entry (same age / curriculum / premium rules as points).
--   * Teachers see and assess ONLY learners who joined their own organization. Every look is logged (log_view).
--   * Anonymous child sessions can never assess. A teacher cannot assess a learner outside their school.
--   * No direct table access for children or teachers: everything goes through the functions below.
--   * Deleting a child's data (delete_my_data) also deletes their portfolio and assessments (cascade from profiles).

-- ---------- 1. competencies ----------
create table if not exists public.competencies (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  name        jsonb not null,
  position    integer not null default 0
);
insert into public.competencies (slug, name, position) values
  ('materials',       '{"ha":"Gane kayan aiki","en":"Identify materials"}', 1),
  ('processes',       '{"ha":"Fahimtar yadda ake sarrafawa","en":"Understand processes"}', 2),
  ('science',         '{"ha":"Bayyana ƙa’idar kimiyya","en":"Explain scientific principles"}', 3),
  ('design',          '{"ha":"Ƙirƙirar mafita","en":"Design solutions"}', 4),
  ('testing',         '{"ha":"Gwada samfuri","en":"Test prototypes"}', 5),
  ('problem-solving', '{"ha":"Warware matsaloli","en":"Solve problems"}', 6),
  ('business',        '{"ha":"Lissafin kasuwanci","en":"Apply business calculations"}', 7),
  ('presenting',      '{"ha":"Gabatar da ra’ayi","en":"Present ideas"}', 8)
on conflict (slug) do nothing;

create table if not exists public.mission_competencies (
  mission_id  uuid not null references public.missions(id) on delete cascade,
  competency  text not null references public.competencies(slug) on delete cascade,
  primary key (mission_id, competency)
);

-- ---------- 2. portfolio + assessments ----------
create table if not exists public.portfolio_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  mission_id    uuid not null references public.missions(id) on delete cascade,
  challenge_key text not null check (challenge_key ~ '^[a-z0-9_-]{1,40}$'),
  kind          text not null check (kind in ('reflect', 'predict', 'simulate', 'business')),
  content       jsonb not null check (jsonb_typeof(content) = 'object' and length(content::text) <= 8000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, mission_id, challenge_key)
);
create index if not exists portfolio_entries_user_idx on public.portfolio_entries (user_id);

create table if not exists public.teacher_assessments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mission_id  uuid references public.missions(id) on delete set null,
  entry_id    uuid references public.portfolio_entries(id) on delete set null,
  competency  text not null references public.competencies(slug),
  score       smallint not null check (score between 1 and 4),
  comment     text check (char_length(comment) <= 500),
  assessed_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists teacher_assessments_user_idx on public.teacher_assessments (user_id, org_id);

alter table public.competencies          enable row level security;
alter table public.mission_competencies  enable row level security;
alter table public.portfolio_entries     enable row level security;
alter table public.teacher_assessments   enable row level security;

drop policy if exists "competencies: read" on public.competencies;
create policy "competencies: read" on public.competencies for select to anon, authenticated using (true);
drop policy if exists "mission_competencies: read" on public.mission_competencies;
create policy "mission_competencies: read" on public.mission_competencies for select to anon, authenticated using (true);
-- no policies on portfolio_entries / teacher_assessments: only the functions below can touch them

revoke all on public.competencies, public.mission_competencies, public.portfolio_entries, public.teacher_assessments from anon, authenticated;
grant select on public.competencies, public.mission_competencies to anon, authenticated;

-- ---------- 3. learner functions ----------
create or replace function public.save_portfolio_entry(p_mission text, p_key text, p_kind text, p_content jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_m public.missions%rowtype; v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'sign in first' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('reflect', 'predict', 'simulate', 'business') then
    raise exception 'unknown kind' using errcode = '22023'; end if;
  if p_key is null or p_key !~ '^[a-z0-9_-]{1,40}$' then raise exception 'bad key' using errcode = '22023'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or length(p_content::text) > 8000 then
    raise exception 'entry is too large' using errcode = '22023'; end if;
  select * into v_m from public.missions where slug = p_mission and status = 'published';
  if not found then raise exception 'unknown or unpublished mission' using errcode = '22023'; end if;
  -- same rules as award_progress(): age, school curriculum, premium
  if not public.age_ok(v_m.level_id, v_m.risk_level, v_uid)
     or not public.in_curriculum(v_m.id, v_uid)
     or not (coalesce(v_m.access, 'free') = 'free' or public.has_premium(v_uid)) then
    raise exception 'this lesson is not available to this learner' using errcode = '22023'; end if;
  if not exists (select 1 from public.portfolio_entries where user_id = v_uid and mission_id = v_m.id and challenge_key = p_key)
     and (select count(*) from public.portfolio_entries where user_id = v_uid) >= 300 then
    raise exception 'portfolio is full' using errcode = '22023'; end if;
  insert into public.portfolio_entries (user_id, mission_id, challenge_key, kind, content)
  values (v_uid, v_m.id, p_key, p_kind, p_content)
  on conflict (user_id, mission_id, challenge_key) do update set kind = excluded.kind, content = excluded.content, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- the shared reader: one learner's entries and teacher feedback (p_org null = learner reading their own, any teacher)
create or replace function public.portfolio_json(p_user uuid, p_org uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'mission', m.slug, 'mission_title', m.title, 'key', e.challenge_key,
                'kind', e.kind, 'content', e.content, 'updated_at', e.updated_at) order by e.updated_at desc)
              from public.portfolio_entries e join public.missions m on m.id = e.mission_id where e.user_id = p_user), '[]'::jsonb),
    'assessments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'competency', a.competency, 'score', a.score, 'comment', a.comment,
                'created_at', a.created_at, 'mission', m.slug, 'entry_id', a.entry_id, 'mine', a.assessed_by = auth.uid()) order by a.created_at desc)
              from public.teacher_assessments a left join public.missions m on m.id = a.mission_id
              where a.user_id = p_user and (p_org is null or a.org_id = p_org)), '[]'::jsonb));
$$;

create or replace function public.my_portfolio() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  return public.portfolio_json(auth.uid(), null);
end $$;

-- ---------- 4. teacher / school functions ----------
create or replace function public.org_learner_portfolio(p_org uuid, p_user uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.learner_memberships where org_id = p_org and user_id = p_user) then
    raise exception 'this learner is not in your organization' using errcode = '42501'; end if;
  perform public.log_view('view_portfolio', 'profiles', p_user::text);
  return public.portfolio_json(p_user, p_org);
end $$;

create or replace function public.org_assess(p_org uuid, p_user uuid, p_competency text, p_score integer, p_comment text,
                                             p_mission text default null, p_entry uuid default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_mission uuid; v_id uuid;
begin
  -- only real school staff assess (an anonymous child session is never an org member)
  if not public.is_org_member(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.learner_memberships where org_id = p_org and user_id = p_user) then
    raise exception 'this learner is not in your organization' using errcode = '42501'; end if;
  if not exists (select 1 from public.competencies where slug = p_competency) then raise exception 'unknown competency' using errcode = '22023'; end if;
  if p_score is null or p_score < 1 or p_score > 4 then raise exception 'score must be 1 to 4' using errcode = '22023'; end if;
  if p_comment is not null and char_length(p_comment) > 500 then raise exception 'comment is too long' using errcode = '22023'; end if;
  if p_mission is not null then select id into v_mission from public.missions where slug = p_mission; end if;
  if p_entry is not null and not exists (select 1 from public.portfolio_entries where id = p_entry and user_id = p_user) then
    raise exception 'that work belongs to another learner' using errcode = '22023'; end if;
  insert into public.teacher_assessments (org_id, user_id, mission_id, entry_id, competency, score, comment, assessed_by)
  values (p_org, p_user, v_mission, p_entry, p_competency, p_score::smallint, nullif(btrim(p_comment), ''), auth.uid())
  returning id into v_id;
  perform public.log_view('assess', 'profiles', p_user::text);
  return v_id;
end $$;

create or replace function public.org_delete_assessment(p_org uuid, p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_org_member(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.teacher_assessments a
   where a.id = p_id and a.org_id = p_org
     and (a.assessed_by = auth.uid() or public.is_org_member(p_org, array['org_admin']));
end $$;

-- one row per learner: latest teacher score per competency, finished lessons per competency, number of portfolio entries
create or replace function public.org_competency_report(p_org uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.log_view('view', 'org_competency_report', p_org::text);
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.nickname) from (
    select lm.user_id as id, p.nickname, lm.student_ref,
      (select coalesce(jsonb_object_agg(x.competency, x.score), '{}'::jsonb) from (
         select distinct on (a.competency) a.competency, a.score
           from public.teacher_assessments a where a.user_id = lm.user_id and a.org_id = p_org
          order by a.competency, a.created_at desc) x) as latest,
      (select coalesce(jsonb_object_agg(t.competency, t.n), '{}'::jsonb) from (
         select mc.competency, count(*) as n
           from public.mission_competencies mc join public.missions m on m.id = mc.mission_id
           join public.user_progress up on up.user_id = lm.user_id and up.event_key = m.slug || ':finish'
          group by mc.competency) t) as completed,
      (select count(*) from public.portfolio_entries e where e.user_id = lm.user_id) as entries
    from public.learner_memberships lm join public.profiles p on p.id = lm.user_id
    where lm.org_id = p_org) r), '[]'::jsonb);
end $$;

-- ---------- 5. content managers tag lessons with skills ----------
create or replace function public.admin_set_mission_competencies(p_mission uuid, p_slugs text[]) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['content_manager']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.mission_competencies where mission_id = p_mission;
  insert into public.mission_competencies (mission_id, competency)
    select p_mission, c.slug from public.competencies c where c.slug = any (coalesce(p_slugs, '{}'));
end $$;

-- ---------- 6. who may call what ----------
revoke all on function public.save_portfolio_entry(text, text, text, jsonb), public.my_portfolio(), public.org_learner_portfolio(uuid, uuid),
  public.org_assess(uuid, uuid, text, integer, text, text, uuid), public.org_delete_assessment(uuid, uuid), public.org_competency_report(uuid),
  public.admin_set_mission_competencies(uuid, text[]) from public, anon;
revoke all on function public.portfolio_json(uuid, uuid) from public, anon, authenticated;   -- internal helper
grant execute on function public.save_portfolio_entry(text, text, text, jsonb), public.my_portfolio(), public.org_learner_portfolio(uuid, uuid),
  public.org_assess(uuid, uuid, text, integer, text, text, uuid), public.org_delete_assessment(uuid, uuid), public.org_competency_report(uuid),
  public.admin_set_mission_competencies(uuid, text[]) to authenticated;
