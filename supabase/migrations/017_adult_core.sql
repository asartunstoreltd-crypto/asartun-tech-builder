-- ASARTUN ADULT LEARNING — Migration 017: core (profiles, staff, classes, courses, enrollments)
-- Owner: ASARTUN STORE LIMITED.  Status: DRAFT FOR REVIEW — not executed anywhere. Run on a TEST project first.
-- Only ADDS objects with the prefix adult_. Nothing existing is altered or dropped. Safe to run twice.
-- Prerequisite: migrations 001-016 applied.
--
-- ACCESS MODEL
--  * The browser can only READ adult tables (through RLS). Every write goes through a function below
--    or through the Edge Function "adult-admin" (service role, server side).
--  * Children's anonymous sessions and school-portal staff have no row in adult_profiles / adult_staff,
--    so every adult policy returns nothing for them.

-- ---------- tables ----------
create table if not exists public.adult_staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('adult_admin','facilitator')),
  active     boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.adult_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null check (char_length(btrim(full_name)) between 1 and 80),
  display_name   text check (display_name is null or char_length(display_name) <= 30),
  phone          text not null unique check (phone ~ '^\+[0-9]{10,15}$'),
  phone_verified boolean not null default false,      -- true only when a facilitator has met the learner; no SMS check exists
  language       text not null default 'ha' check (language in ('ha','en')),
  low_data       boolean not null default false,
  audio_on       boolean not null default true,
  status         text not null default 'active' check (status in ('active','suspended')),
  created_by     uuid references auth.users(id) on delete set null,   -- facilitator when registration was assisted
  consent_at     timestamptz not null default now(),
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.adult_courses (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind                text not null check (kind in ('literacy','numeracy','digital','english')),
  title               jsonb not null default '{"ha":"","en":""}'::jsonb,
  description         jsonb not null default '{"ha":"","en":""}'::jsonb,
  is_free             boolean not null default true,
  price_ngn           integer not null default 0 check (price_ngn >= 0),
  access_days         integer check (access_days is null or access_days > 0),   -- null = no end date
  prerequisite_course uuid references public.adult_courses(id) on delete set null,
  position            integer not null default 0,
  status              text not null default 'draft' check (status in ('draft','published','coming_soon','archived')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (is_free = (price_ngn = 0))
);

create table if not exists public.adult_classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  course_id  uuid references public.adult_courses(id) on delete set null,
  mode       text not null default 'physical' check (mode in ('physical','online','both')),
  location   text check (location is null or char_length(location) <= 120),
  schedule   jsonb not null default '{}'::jsonb,
  status     text not null default 'active' check (status in ('active','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.adult_class_staff (
  class_id uuid not null references public.adult_classes(id) on delete cascade,
  user_id  uuid not null references public.adult_staff(user_id) on delete cascade,
  primary key (class_id, user_id)
);
create table if not exists public.adult_class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.adult_classes(id) on delete cascade,
  learner_id uuid not null references public.adult_profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  unique (class_id, learner_id)
);
create index if not exists adult_class_members_learner_idx on public.adult_class_members (learner_id) where left_at is null;

create table if not exists public.adult_enrollments (
  id         uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.adult_profiles(id) on delete cascade,
  course_id  uuid not null references public.adult_courses(id) on delete cascade,
  source     text not null default 'free' check (source in ('free','payment','staff')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (learner_id, course_id)
);

create table if not exists public.adult_audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  learner_id uuid,                                  -- no foreign key: the log survives deletion of the learner
  details    jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create index if not exists adult_audit_learner_idx on public.adult_audit_log (learner_id, at);

-- Used only by the Edge Function to limit self-registration. No policies = browser can never read it.
create table if not exists public.adult_register_attempts (
  id      bigint generated always as identity primary key,
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index if not exists adult_register_attempts_idx on public.adult_register_attempts (ip_hash, at);

drop trigger if exists adult_profiles_touch on public.adult_profiles;
create trigger adult_profiles_touch before update on public.adult_profiles for each row execute function public.set_updated_at();

-- ---------- helper functions (security definer: they look at tables the caller cannot read directly) ----------
create or replace function public.is_adult_staff(p_roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_staff s
                 where s.user_id = auth.uid() and s.active and (p_roles is null or s.role = any(p_roles)));
$$;
create or replace function public.is_adult_learner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_profiles p where p.id = auth.uid() and p.status = 'active');
$$;
-- True for the adult admin, or for a facilitator who is assigned to a class this learner currently belongs to.
create or replace function public.staff_can_see_learner(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_adult_staff(array['adult_admin'])
      or (public.is_adult_staff(array['facilitator']) and exists (
            select 1 from public.adult_class_members m
            join public.adult_class_staff cs on cs.class_id = m.class_id and cs.user_id = auth.uid()
            where m.learner_id = p_learner and m.left_at is null));
$$;
create or replace function public.adult_can_manage_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_adult_staff(array['adult_admin'])
      or (public.is_adult_staff(array['facilitator']) and exists (
            select 1 from public.adult_class_staff cs where cs.class_id = p_class and cs.user_id = auth.uid()));
$$;
create or replace function public.adult_log(p_action text, p_learner uuid, p_details jsonb default '{}'::jsonb) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.adult_audit_log (actor_id, action, learner_id, details) values (auth.uid(), p_action, p_learner, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------- Row Level Security ----------
alter table public.adult_staff            enable row level security;
alter table public.adult_profiles         enable row level security;
alter table public.adult_courses          enable row level security;
alter table public.adult_classes          enable row level security;
alter table public.adult_class_staff      enable row level security;
alter table public.adult_class_members    enable row level security;
alter table public.adult_enrollments      enable row level security;
alter table public.adult_audit_log        enable row level security;
alter table public.adult_register_attempts enable row level security;

drop policy if exists "adult_staff: own or admin" on public.adult_staff;
create policy "adult_staff: own or admin" on public.adult_staff for select to authenticated
  using (user_id = auth.uid() or public.is_adult_staff(array['adult_admin']));

drop policy if exists "adult_profiles: own or staff" on public.adult_profiles;
create policy "adult_profiles: own or staff" on public.adult_profiles for select to authenticated
  using (id = auth.uid() or public.staff_can_see_learner(id));
drop policy if exists "adult_profiles: update own settings" on public.adult_profiles;
create policy "adult_profiles: update own settings" on public.adult_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());       -- columns are limited by GRANT below

drop policy if exists "adult_courses: read" on public.adult_courses;
create policy "adult_courses: read" on public.adult_courses for select to authenticated
  using (public.is_adult_staff() or (status in ('published','coming_soon') and public.is_adult_learner()));

drop policy if exists "adult_classes: staff or member" on public.adult_classes;
create policy "adult_classes: staff or member" on public.adult_classes for select to authenticated
  using (public.adult_can_manage_class(id)
         or exists (select 1 from public.adult_class_members m where m.class_id = public.adult_classes.id and m.learner_id = auth.uid() and m.left_at is null));
drop policy if exists "adult_class_staff: read" on public.adult_class_staff;
create policy "adult_class_staff: read" on public.adult_class_staff for select to authenticated
  using (user_id = auth.uid() or public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult_class_members: read" on public.adult_class_members;
create policy "adult_class_members: read" on public.adult_class_members for select to authenticated
  using (learner_id = auth.uid() or public.adult_can_manage_class(class_id));

drop policy if exists "adult_enrollments: own or staff" on public.adult_enrollments;
create policy "adult_enrollments: own or staff" on public.adult_enrollments for select to authenticated
  using (learner_id = auth.uid() or public.staff_can_see_learner(learner_id));

drop policy if exists "adult_audit: admin read" on public.adult_audit_log;
create policy "adult_audit: admin read" on public.adult_audit_log for select to authenticated
  using (public.is_adult_staff(array['adult_admin']));

-- Table privileges: browser roles may only read; the single exception is the learner's own comfort settings.
do $$
declare t text;
begin
  foreach t in array array['adult_staff','adult_profiles','adult_courses','adult_classes','adult_class_staff',
                           'adult_class_members','adult_enrollments','adult_audit_log','adult_register_attempts'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.adult_staff, public.adult_profiles, public.adult_courses, public.adult_classes,
                public.adult_class_staff, public.adult_class_members, public.adult_enrollments, public.adult_audit_log
  to authenticated;
grant update (display_name, language, low_data, audio_on) on public.adult_profiles to authenticated;

-- ---------- functions the app calls ----------
create or replace function public.adult_touch() returns void
language sql volatile security definer set search_path = '' as $$
  update public.adult_profiles set last_active_at = now() where id = auth.uid();
$$;

-- A learner joins a FREE, published course. Paid courses go through payment (Phase 8), never through here.
create or replace function public.adult_enroll_free(p_course uuid) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; v_id uuid;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_courses where id = p_course;
  if c.id is null or c.status <> 'published' or not c.is_free then raise exception 'course not available' using errcode = 'P0001'; end if;
  insert into public.adult_enrollments (learner_id, course_id, source, ends_at)
  values (auth.uid(), c.id, 'free', case when c.access_days is null then null else now() + make_interval(days => c.access_days) end)
  on conflict (learner_id, course_id) do nothing;
  select id into v_id from public.adult_enrollments where learner_id = auth.uid() and course_id = c.id;
  return v_id;
end $$;

-- Staff list. A facilitator sees only learners of their own classes; the adult admin sees everyone.
create or replace function public.adult_staff_learners(p_search text default null)
returns table (id uuid, full_name text, display_name text, phone text, phone_verified boolean, status text,
               classes text[], enrollments integer, created_at timestamptz, last_active_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.display_name, p.phone, p.phone_verified, p.status,
           coalesce((select array_agg(c.name order by c.name) from public.adult_class_members m
                     join public.adult_classes c on c.id = m.class_id where m.learner_id = p.id and m.left_at is null), '{}'),
           (select count(*)::int from public.adult_enrollments e where e.learner_id = p.id),
           p.created_at, p.last_active_at
    from public.adult_profiles p
    where public.staff_can_see_learner(p.id)
      and (p_search is null or p.full_name ilike '%' || p_search || '%' or p.phone like '%' || regexp_replace(p_search, '[^0-9]', '', 'g') || '%')
    order by p.full_name
    limit 300;
end $$;

create or replace function public.adult_admin_create_class(p_name text, p_course uuid, p_mode text, p_location text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  insert into public.adult_classes (name, course_id, mode, location, created_by)
  values (btrim(p_name), p_course, coalesce(p_mode, 'physical'), nullif(btrim(coalesce(p_location, '')), ''), auth.uid()) returning id into v;
  perform public.adult_log('create_class', null, jsonb_build_object('class', v));
  return v;
end $$;

create or replace function public.adult_admin_assign_facilitator(p_class uuid, p_email text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select s.user_id into v_user from public.adult_staff s join auth.users u on u.id = s.user_id
   where lower(u.email) = lower(btrim(p_email)) and s.active;
  if v_user is null then raise exception 'no active staff account with that email' using errcode = 'P0001'; end if;
  insert into public.adult_class_staff (class_id, user_id) values (p_class, v_user) on conflict do nothing;
  perform public.adult_log('assign_facilitator', null, jsonb_build_object('class', p_class, 'staff', v_user));
end $$;

-- Add an already-registered learner to a class (by phone). The caller must manage that class.
create or replace function public.adult_staff_add_member(p_class uuid, p_phone text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_learner uuid;
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  select id into v_learner from public.adult_profiles where phone = p_phone and status = 'active';
  if v_learner is null then raise exception 'no learner with that phone number' using errcode = 'P0001'; end if;
  insert into public.adult_class_members (class_id, learner_id) values (p_class, v_learner)
  on conflict (class_id, learner_id) do update set left_at = null;
  perform public.adult_log('add_member', v_learner, jsonb_build_object('class', p_class));
  return v_learner;
end $$;
create or replace function public.adult_staff_remove_member(p_class uuid, p_learner uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.adult_class_members set left_at = now() where class_id = p_class and learner_id = p_learner and left_at is null;
  perform public.adult_log('remove_member', p_learner, jsonb_build_object('class', p_class));
end $$;

-- The learner may erase their own adult account and everything linked to it.
create or replace function public.adult_delete_my_account() returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.adult_profiles where id = auth.uid()) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.adult_log('delete_account', auth.uid(), '{}'::jsonb);
  delete from auth.users where id = auth.uid();         -- cascades to adult_profiles and everything that references it
end $$;

-- Only signed-in users may call these; anonymous visitors may not.
do $$
declare f text;
begin
  foreach f in array array[
    'is_adult_staff(text[])','is_adult_learner()','staff_can_see_learner(uuid)','adult_can_manage_class(uuid)',
    'adult_log(text,uuid,jsonb)','adult_touch()','adult_enroll_free(uuid)','adult_staff_learners(text)',
    'adult_admin_create_class(text,uuid,text,text)','adult_admin_assign_facilitator(uuid,text)',
    'adult_staff_add_member(uuid,text)','adult_staff_remove_member(uuid,uuid)','adult_delete_my_account()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
-- adult_log writes the audit trail: nobody but other database functions may call it directly.
revoke execute on function public.adult_log(text,uuid,jsonb) from authenticated;

-- ---------- starting courses (lessons are added in later phases) ----------
insert into public.adult_courses (slug, kind, title, description, is_free, price_ngn, position, status) values
 ('basic-literacy','literacy','{"ha":"Karatu da Rubutu na Farko","en":"Basic Literacy"}','{"ha":"Haruffa, sautuka, kalmomi da jimloli.","en":"Letters, sounds, words and sentences."}',true,0,1,'published'),
 ('basic-numeracy','numeracy','{"ha":"Lissafi na Farko","en":"Basic Numeracy"}','{"ha":"Lambobi, ƙidaya, ƙari, ragi da lissafin kuɗi.","en":"Numbers, counting, adding, subtracting and money."}',true,0,2,'published'),
 ('basic-digital','digital','{"ha":"Amfani da Waya da Intanet","en":"Basic Digital Literacy"}','{"ha":"Waya, saƙonni, WhatsApp da kariya daga zamba.","en":"Phone, messages, WhatsApp and staying safe from scams."}',true,0,3,'coming_soon')
on conflict (slug) do nothing;
update public.adult_courses d set prerequisite_course = (select id from public.adult_courses where slug = 'basic-literacy')
 where d.slug = 'basic-digital' and d.prerequisite_course is null;
