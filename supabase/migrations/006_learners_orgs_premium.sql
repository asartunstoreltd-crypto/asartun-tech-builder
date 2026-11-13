-- ASARTUN TECH BUILDER — Migration 006: learner records, schools/companies, premium
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-005.  Safe to run twice.
-- No real names, phones, emails or photos of children are stored. A child is a nickname + optional age band.
-- Schools/companies may attach THEIR OWN student reference (e.g. "JSS1-014"); ASARTUN never needs the real name.

-- =====================================================================
-- 1. Learner activity (who is using the app, and where they struggle)
-- =====================================================================
create table if not exists public.learning_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  event_key  text not null,                              -- 'cassava:quiz-3'
  kind       text not null check (kind in ('quiz_wrong')),
  created_at timestamptz not null default now()
);
create index if not exists learning_events_key_idx  on public.learning_events (event_key, kind);
create index if not exists learning_events_user_idx on public.learning_events (user_id, created_at);

-- =====================================================================
-- 2. Organizations (schools, companies, NGOs), classes, memberships
-- =====================================================================
create or replace function public.gen_join_code() returns text
language sql volatile set search_path = '' as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 2 and 120),
  org_type          text not null default 'school' check (org_type in ('school','company','ngo','other')),
  join_code         text not null unique default public.gen_join_code(),
  status            text not null default 'active' check (status in ('active','suspended')),
  consent_confirmed boolean not null default false,     -- organization confirmed it has parental consent
  consent_note      text,
  max_learners      integer check (max_learners > 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create table if not exists public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'teacher' check (role in ('org_admin','teacher')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create table if not exists public.org_classes (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  join_code  text not null unique default public.gen_join_code(),
  created_at timestamptz not null default now()
);
create table if not exists public.learner_memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  class_id    uuid references public.org_classes(id) on delete set null,
  student_ref text check (char_length(student_ref) <= 40),
  joined_at   timestamptz not null default now(),
  unique (user_id, org_id)
);
create index if not exists learner_memberships_org_idx on public.learner_memberships (org_id);
create table if not exists public.join_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now()
);

-- =====================================================================
-- 3. Premium
-- =====================================================================
alter table public.missions add column if not exists access text not null default 'free' check (access in ('free','premium'));
create table if not exists public.entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  org_id     uuid references public.organizations(id) on delete cascade,
  source     text not null default 'manual' check (source in ('manual','organization','payment')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,                                -- null = no end date
  note       text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (org_id is null))          -- exactly one target
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);
create index if not exists entitlements_org_idx  on public.entitlements (org_id);

do $$ declare t text; begin
  foreach t in array array['organizations'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['organizations','org_members','org_classes','entitlements'] loop
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I for each row execute function public.log_admin_change()', t);
  end loop;
end $$;

-- =====================================================================
-- 4. Helpers used by policies
-- =====================================================================
create or replace function public.is_org_member(p_org uuid, p_roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.org_members m
                 where m.org_id = p_org and m.user_id = auth.uid() and (p_roles is null or m.role = any (p_roles)));
$$;
create or replace function public.can_see_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin() or public.is_org_member(p_org);
$$;
create or replace function public.has_premium(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_uid is not null and (
    exists (select 1 from public.entitlements e
            where e.user_id = p_uid and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()))
    or exists (select 1 from public.learner_memberships lm
               join public.organizations o on o.id = lm.org_id and o.status = 'active'
               join public.entitlements e on e.org_id = lm.org_id and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
               where lm.user_id = p_uid));
$$;

-- =====================================================================
-- 5. Row Level Security
-- =====================================================================
alter table public.learning_events     enable row level security;
alter table public.organizations       enable row level security;
alter table public.org_members         enable row level security;
alter table public.org_classes         enable row level security;
alter table public.learner_memberships enable row level security;
alter table public.join_attempts       enable row level security;
alter table public.entitlements        enable row level security;
revoke all on public.learning_events, public.organizations, public.org_members, public.org_classes,
              public.learner_memberships, public.join_attempts, public.entitlements from anon;
revoke insert, update, delete on public.learning_events, public.learner_memberships, public.join_attempts from authenticated;

drop policy if exists "orgs: super admin all" on public.organizations;
create policy "orgs: super admin all" on public.organizations for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "orgs: members read" on public.organizations;
create policy "orgs: members read" on public.organizations for select to authenticated using (public.is_org_member(id));

drop policy if exists "org_members: read own" on public.org_members;
create policy "org_members: read own" on public.org_members for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "org_members: super admin manages" on public.org_members;
create policy "org_members: super admin manages" on public.org_members for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "classes: staff read" on public.org_classes;
create policy "classes: staff read" on public.org_classes for select to authenticated using (public.can_see_org(org_id));
drop policy if exists "classes: org admin manages" on public.org_classes;
create policy "classes: org admin manages" on public.org_classes for all to authenticated
  using (public.is_super_admin() or public.is_org_member(org_id, array['org_admin']))
  with check (public.is_super_admin() or public.is_org_member(org_id, array['org_admin']));

drop policy if exists "memberships: read own" on public.learner_memberships;
create policy "memberships: read own" on public.learner_memberships for select to authenticated using (user_id = auth.uid());

drop policy if exists "entitlements: super admin read" on public.entitlements;
create policy "entitlements: super admin read" on public.entitlements for select to authenticated using (public.is_super_admin());
-- (learning_events and join_attempts: no policy = nobody reads them directly; only the functions below)

-- Premium lessons: steps and questions are readable only with an active premium entitlement.
drop policy if exists "steps: public read published" on public.mission_steps;
create policy "steps: public read published" on public.mission_steps for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = mission_steps.mission_id and m.status = 'published'
                 and (m.access = 'free' or public.has_premium(auth.uid()))));
drop policy if exists "questions: public read published" on public.game_questions;
create policy "questions: public read published" on public.game_questions for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = game_questions.mission_id and m.status = 'published'
                 and (m.access = 'free' or public.has_premium(auth.uid()))));

-- Premium media: same rule for pictures and audio (cover images stay visible so locked cards look nice).
create or replace function public.media_learner_readable(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_path is not null and (
    exists (select 1 from public.missions m where m.status = 'published' and m.cover_image_path = p_path)
    or exists (select 1 from public.mission_steps s join public.missions m on m.id = s.mission_id
               where m.status = 'published' and (m.access = 'free' or public.has_premium(auth.uid()))
                 and position(p_path in s.content::text) > 0)
    or exists (select 1 from public.game_questions q join public.missions m on m.id = q.mission_id
               where m.status = 'published' and (m.access = 'free' or public.has_premium(auth.uid()))
                 and position(p_path in q.media::text) > 0));
$$;
drop policy if exists "media bucket: learners read published" on storage.objects;
create policy "media bucket: learners read published" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media' and public.media_learner_readable(name));

-- =====================================================================
-- 6. Learner functions
-- =====================================================================
create or replace function public.touch_active() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  update public.profiles set last_active_at = now()
   where id = auth.uid() and (last_active_at is null or last_active_at < now() - interval '1 minute');
end $$;

create or replace function public.log_quiz_wrong(p_event_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_m uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then return; end if;
  if p_event_key is null or length(p_event_key) > 80 or p_event_key !~ '^[a-z0-9-]+:quiz-[0-9]+$' then return; end if;
  select id into v_m from public.missions where slug = split_part(p_event_key, ':', 1) and status = 'published';
  if v_m is null then return; end if;
  if (select count(*) from public.learning_events where user_id = v_uid and created_at > now() - interval '1 day') >= 500 then return; end if;
  insert into public.learning_events (user_id, mission_id, event_key, kind) values (v_uid, v_m, p_event_key, 'quiz_wrong');
end $$;

create or replace function public.join_with_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text := upper(btrim(coalesce(p_code, '')));
        v_org public.organizations; v_class public.org_classes; v_seats integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'create a profile first' using errcode = 'P0001'; end if;
  if (select count(*) from public.join_attempts where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts, try again later' using errcode = '54000'; end if;
  insert into public.join_attempts (user_id) values (v_uid);
  select * into v_class from public.org_classes where join_code = v_code;
  if found then select * into v_org from public.organizations where id = v_class.org_id;
  else select * into v_org from public.organizations where join_code = v_code; end if;
  if v_org.id is null or v_org.status <> 'active' or not v_org.consent_confirmed then
    raise exception 'invalid code' using errcode = '22023'; end if;
  select count(*) into v_seats from public.learner_memberships where org_id = v_org.id and user_id <> v_uid;
  if v_org.max_learners is not null and v_seats >= v_org.max_learners then
    raise exception 'this organization is full' using errcode = '53400'; end if;
  insert into public.learner_memberships (user_id, org_id, class_id) values (v_uid, v_org.id, v_class.id)
  on conflict (user_id, org_id) do update set class_id = coalesce(excluded.class_id, public.learner_memberships.class_id);
  return jsonb_build_object('org', v_org.name, 'class', v_class.name);
end $$;

create or replace function public.my_memberships() returns table (org_id uuid, org_name text, org_type text, class_name text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.org_type, c.name from public.learner_memberships lm
  join public.organizations o on o.id = lm.org_id left join public.org_classes c on c.id = lm.class_id
  where lm.user_id = auth.uid();
$$;
create or replace function public.leave_organization(p_org uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.learner_memberships where user_id = auth.uid() and org_id = p_org;
$$;
-- A child (or parent) can erase the online record. Progress, badges, events and memberships go with it.
create or replace function public.delete_my_data() returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.profiles where id = auth.uid();
$$;
create or replace function public.my_premium() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('active', public.has_premium(auth.uid()));
$$;

-- =====================================================================
-- 7. Results (ASARTUN admins and organization staff). Every look at a child's record is logged.
-- =====================================================================
create or replace function public.learner_results_json(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'nickname', p.nickname, 'age_band', p.age_band, 'points', p.points,
    'last_active_at', p.last_active_at, 'created_at', p.created_at,
    'events', coalesce((select jsonb_agg(jsonb_build_object('key', up.event_key, 'points', up.points_awarded, 'at', up.created_at) order by up.created_at)
                        from public.user_progress up where up.user_id = p.id), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(r.slug) from public.user_rewards ur join public.rewards r on r.id = ur.reward_id where ur.user_id = p.id), '[]'::jsonb),
    'wrong', coalesce((select jsonb_agg(jsonb_build_object('key', w.k, 'count', w.c))
                       from (select le.event_key as k, count(*) as c from public.learning_events le
                             where le.user_id = p.id and le.kind = 'quiz_wrong' group by le.event_key) w), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('org', o.name, 'class', c.name, 'student_ref', lm.student_ref))
                             from public.learner_memberships lm join public.organizations o on o.id = lm.org_id
                             left join public.org_classes c on c.id = lm.class_id where lm.user_id = p.id), '[]'::jsonb))
  from public.profiles p where p.id = p_user;
$$;

create or replace function public.insights_json(p_org uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with scope as (
    select p.id from public.profiles p
    where p_org is null or exists (select 1 from public.learner_memberships lm where lm.user_id = p.id and lm.org_id = p_org))
  select jsonb_build_object(
    'learners', (select count(*) from scope),
    'active_7d', (select count(*) from public.profiles p join scope s on s.id = p.id where p.last_active_at > now() - interval '7 days'),
    'missions', coalesce((select jsonb_agg(to_jsonb(t) order by t.slug) from (
        select m.slug, m.title,
          count(distinct up.user_id) filter (where up.event_key = m.slug || ':teach')        as reached_learn,
          count(distinct up.user_id) filter (where up.event_key like m.slug || ':show-%')      as reached_watch,
          count(distinct up.user_id) filter (where up.event_key like m.slug || ':practice-%')  as reached_practice,
          count(distinct up.user_id) filter (where up.event_key like m.slug || ':challenge-%') as reached_challenge,
          count(distinct up.user_id) filter (where up.event_key like m.slug || ':quiz-%')      as reached_quiz,
          count(distinct up.user_id) filter (where up.event_key = m.slug || ':finish')         as finished
        from public.missions m
        left join public.user_progress up on up.mission_id = m.id and up.user_id in (select id from scope)
        where m.status = 'published' group by m.id) t), '[]'::jsonb),
    'hard_questions', coalesce((select jsonb_agg(to_jsonb(q)) from (
        select le.event_key as key, count(*) as wrong, count(distinct le.user_id) as learners,
          (select count(*) from public.user_progress u2 where u2.event_key = le.event_key and u2.user_id in (select id from scope)) as correct,
          (select g.question ->> 'en' from public.game_questions g join public.missions mm on mm.id = g.mission_id
            where mm.slug = split_part(le.event_key, ':', 1)
              and g.position = (substring(le.event_key from 'quiz-([0-9]+)$'))::int) as question
        from public.learning_events le
        where le.kind = 'quiz_wrong' and le.user_id in (select id from scope)
        group by le.event_key order by count(*) desc limit 10) q), '[]'::jsonb));
$$;

create or replace function public.log_view(p_action text, p_entity text, p_id text) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.admin_activity_logs (actor_id, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_id, '{}'::jsonb);
$$;

create or replace function public.admin_live_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['learning_analyst']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'online_now',   (select count(*) from public.profiles where last_active_at > now() - interval '5 minutes'),
    'active_today', (select count(*) from public.profiles where last_active_at >= date_trunc('day', now())),
    'active_7d',    (select count(*) from public.profiles where last_active_at > now() - interval '7 days'),
    'new_today',    (select count(*) from public.profiles where created_at >= date_trunc('day', now())),
    'total',        (select count(*) from public.profiles),
    'organizations',(select count(*) from public.organizations),
    'premium_learners', (select count(*) from public.profiles p where public.has_premium(p.id)));
end $$;

create or replace function public.admin_learners(p_search text default null, p_org uuid default null, p_limit integer default 100, p_offset integer default 0)
returns table (id uuid, nickname text, age_band text, points integer, missions_completed bigint, last_active_at timestamptz,
               created_at timestamptz, orgs text, premium boolean, online boolean)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['learning_analyst']) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.log_view('view', 'learners', null);
  return query
    select p.id, p.nickname, p.age_band, p.points,
           (select count(*) from public.user_progress up where up.user_id = p.id and up.event_key like '%:finish'),
           p.last_active_at, p.created_at,
           (select string_agg(o.name, ', ') from public.learner_memberships lm join public.organizations o on o.id = lm.org_id where lm.user_id = p.id),
           public.has_premium(p.id),
           coalesce(p.last_active_at > now() - interval '5 minutes', false)
    from public.profiles p
    where (p_search is null or p_search = '' or p.nickname ilike '%' || p_search || '%')
      and (p_org is null or exists (select 1 from public.learner_memberships lm where lm.user_id = p.id and lm.org_id = p_org))
    order by p.last_active_at desc nulls last
    limit least(coalesce(p_limit, 100), 500) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_learner_results(p_user uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['learning_analyst']) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.log_view('view_learner', 'profiles', p_user::text);
  return public.learner_results_json(p_user) || jsonb_build_object('premium', public.has_premium(p_user));
end $$;

create or replace function public.admin_insights() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['learning_analyst']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return public.insights_json(null);
end $$;

-- Organization staff: only THEIR learners. They never see other organizations, and no child contact details exist.
create or replace function public.org_staff_orgs() returns table (id uuid, name text, org_type text, role text, join_code text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.org_type, m.role, case when m.role = 'org_admin' then o.join_code end
  from public.org_members m join public.organizations o on o.id = m.org_id where m.user_id = auth.uid();
$$;

create or replace function public.org_learners(p_org uuid)
returns table (id uuid, nickname text, age_band text, points integer, missions_completed bigint, last_active_at timestamptz,
               class_name text, student_ref text, joined_at timestamptz, online boolean)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.log_view('view', 'org_learners', p_org::text);
  return query
    select p.id, p.nickname, p.age_band, p.points,
           (select count(*) from public.user_progress up where up.user_id = p.id and up.event_key like '%:finish'),
           p.last_active_at, c.name, lm.student_ref, lm.joined_at,
           coalesce(p.last_active_at > now() - interval '5 minutes', false)
    from public.learner_memberships lm join public.profiles p on p.id = lm.user_id left join public.org_classes c on c.id = lm.class_id
    where lm.org_id = p_org order by p.last_active_at desc nulls last;
end $$;

create or replace function public.org_learner_results(p_org uuid, p_user uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.learner_memberships where org_id = p_org and user_id = p_user) then
    raise exception 'this learner is not in your organization' using errcode = '42501'; end if;
  perform public.log_view('view_learner', 'profiles', p_user::text);
  return public.learner_results_json(p_user) - 'memberships';
end $$;

create or replace function public.org_report(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  return public.insights_json(p_org);
end $$;

create or replace function public.org_set_student_ref(p_org uuid, p_user uuid, p_ref text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.can_see_org(p_org) then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.learner_memberships set student_ref = nullif(btrim(p_ref), '') where org_id = p_org and user_id = p_user;
end $$;

-- =====================================================================
-- 8. Super Admin: organizations, staff, premium
-- =====================================================================
create or replace function public.admin_add_org_member(p_org uuid, p_email text, p_role text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_u uuid;
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select id into v_u from auth.users where lower(email) = lower(btrim(p_email));
  if v_u is null then raise exception 'No user with this email. Create the user first in Supabase > Authentication > Users.' using errcode = '22023'; end if;
  insert into public.org_members (org_id, user_id, role) values (p_org, v_u, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
end $$;

create or replace function public.admin_org_staff(p_org uuid) returns table (id uuid, email text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select m.id, u.email::text, m.role from public.org_members m join auth.users u on u.id = m.user_id where m.org_id = p_org;
end $$;

create or replace function public.admin_regenerate_org_code(p_org uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v text := public.gen_join_code();
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.organizations set join_code = v where id = p_org;
  return v;
end $$;

create or replace function public.admin_grant_premium(p_user uuid, p_org uuid, p_until timestamptz, p_note text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if (p_user is null) = (p_org is null) then raise exception 'choose a learner or an organization' using errcode = '22023'; end if;
  insert into public.entitlements (user_id, org_id, source, ends_at, note, granted_by)
  values (p_user, p_org, case when p_org is not null then 'organization' else 'manual' end, p_until, nullif(btrim(p_note), ''), auth.uid())
  returning id into v;
  return v;
end $$;

create or replace function public.admin_revoke_premium(p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.entitlements set ends_at = now() where id = p_id and (ends_at is null or ends_at > now());
end $$;

create or replace function public.admin_entitlements() returns table (id uuid, who text, kind text, source text, starts_at timestamptz,
                                                                      ends_at timestamptz, note text, active boolean, granted_by_email text,
                                                                      org_id uuid, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select e.id, coalesce((select p.nickname from public.profiles p where p.id = e.user_id), (select o.name from public.organizations o where o.id = e.org_id)),
           case when e.org_id is not null then 'organization' else 'learner' end, e.source, e.starts_at, e.ends_at, e.note,
           (e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())),
           (select u.email::text from auth.users u where u.id = e.granted_by), e.org_id, e.user_id
    from public.entitlements e order by e.created_at desc limit 500;
end $$;

-- =====================================================================
-- 9. Function privileges
-- =====================================================================
revoke all on function
  public.gen_join_code(), public.is_org_member(uuid, text[]), public.can_see_org(uuid), public.has_premium(uuid),
  public.media_learner_readable(text), public.touch_active(), public.log_quiz_wrong(text), public.join_with_code(text),
  public.my_memberships(), public.leave_organization(uuid), public.delete_my_data(), public.my_premium(),
  public.learner_results_json(uuid), public.insights_json(uuid), public.log_view(text, text, text),
  public.admin_live_stats(), public.admin_learners(text, uuid, integer, integer), public.admin_learner_results(uuid), public.admin_insights(),
  public.org_staff_orgs(), public.org_learners(uuid), public.org_learner_results(uuid, uuid), public.org_report(uuid),
  public.org_set_student_ref(uuid, uuid, text), public.admin_add_org_member(uuid, text, text), public.admin_org_staff(uuid),
  public.admin_regenerate_org_code(uuid), public.admin_grant_premium(uuid, uuid, timestamptz, text), public.admin_revoke_premium(uuid),
  public.admin_entitlements()
from public, anon;
-- internal helpers: only other database functions may call these
revoke all on function public.learner_results_json(uuid), public.insights_json(uuid), public.log_view(text, text, text) from authenticated;

grant execute on function public.has_premium(uuid), public.media_learner_readable(text) to anon, authenticated;
grant execute on function
  public.gen_join_code(), public.is_org_member(uuid, text[]), public.can_see_org(uuid), public.touch_active(), public.log_quiz_wrong(text),
  public.join_with_code(text), public.my_memberships(), public.leave_organization(uuid), public.delete_my_data(), public.my_premium(),
  public.admin_live_stats(), public.admin_learners(text, uuid, integer, integer), public.admin_learner_results(uuid), public.admin_insights(),
  public.org_staff_orgs(), public.org_learners(uuid), public.org_learner_results(uuid, uuid), public.org_report(uuid),
  public.org_set_student_ref(uuid, uuid, text), public.admin_add_org_member(uuid, text, text), public.admin_org_staff(uuid),
  public.admin_regenerate_org_code(uuid), public.admin_grant_premium(uuid, uuid, timestamptz, text), public.admin_revoke_premium(uuid),
  public.admin_entitlements()
to authenticated;
