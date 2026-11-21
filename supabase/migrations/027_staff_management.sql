-- ASARTUN ADULT LEARNING — Migration 027: staff management & teacher/class assignments (unified dashboard)
-- Status: DRAFT FOR REVIEW — NOT applied anywhere. Run on a TEST project first, then production.
-- ADDITIVE ONLY: adds columns, indexes, a trigger and functions. Nothing is dropped, renamed, truncated or rewritten. Safe to run twice.
-- Prerequisite: migrations 017-026 applied.
--
-- WHAT THIS REUSES (no duplicate structures)
--  * adult_staff        — the staff list. `active` already means Active / Suspended and is checked by is_adult_staff() on every RLS call.
--  * adult_class_staff  — the teacher-to-class assignment table. Its primary key (class_id, user_id) already forbids duplicate assignments
--                         and a teacher may already have many classes.
--  * adult_class_members— learner counts come from rows with left_at is null (the real, current membership).
--  * adult_audit_log    — the history of who assigned / moved / removed what, and when.
--
-- SECURITY MODEL
--  * No RLS policy is added or changed: the browser still has SELECT only, through the existing policies. Every new function below is
--    SECURITY DEFINER, pinned to search_path = '' and starts with an adult_admin check (is_adult_staff(array['adult_admin'])).
--  * That check requires adult_staff.active, so a suspended adult admin loses these functions at once.
--  * A /admin Super Admin (admin_roles) gets NOTHING here unless the same user also has an active adult_staff row.

-- ---------- columns ----------
alter table public.adult_staff
  add column if not exists full_name    text check (full_name is null or char_length(btrim(full_name)) between 1 and 80),
  add column if not exists phone        text check (phone is null or phone ~ '^\+[0-9]{10,15}$'),
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null;

-- assigned_at stays NULL for assignments that existed before this migration (the real date is unknown); new ones get now().
alter table public.adult_class_staff add column if not exists assigned_by uuid references auth.users(id) on delete set null;
alter table public.adult_class_staff add column if not exists assigned_at timestamptz;
alter table public.adult_class_staff alter column assigned_at set default now();

-- ---------- indexes ----------
create unique index if not exists adult_staff_phone_uidx   on public.adult_staff (phone) where phone is not null;
create index        if not exists adult_class_staff_user_idx on public.adult_class_staff (user_id);
create index        if not exists adult_audit_actor_idx    on public.adult_audit_log (actor_id, at desc);
create index        if not exists adult_feedback_reviewer_idx on public.adult_feedback (reviewer_id, updated_at desc);

-- ---------- every assignment records who made it and when, including the older "assign by email" function ----------
create or replace function public.adult_class_staff_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.assigned_by := coalesce(new.assigned_by, auth.uid());
  new.assigned_at := coalesce(new.assigned_at, now());
  return new;
end $$;
drop trigger if exists adult_class_staff_stamp on public.adult_class_staff;
create trigger adult_class_staff_stamp before insert on public.adult_class_staff for each row execute function public.adult_class_staff_stamp();

-- ---------- the staff list: every staff member with every assigned class and its CURRENT learner count ----------
create or replace function public.adult_admin_list_staff() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(x.j order by x.sort_name)
    from (
      select lower(coalesce(s.full_name, u.email::text)) as sort_name,
        jsonb_build_object(
          'user_id', s.user_id, 'full_name', s.full_name, 'phone', s.phone, 'email', u.email, 'role', s.role,
          'active', s.active, 'created_at', s.created_at, 'suspended_at', s.suspended_at, 'last_sign_in_at', u.last_sign_in_at,
          'classes', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'id', c.id, 'name', c.name, 'status', c.status, 'assigned_at', cs.assigned_at,
                     'learners', (select count(*)::int from public.adult_class_members m where m.class_id = c.id and m.left_at is null))
                   order by c.name)
            from public.adult_class_staff cs join public.adult_classes c on c.id = cs.class_id
            where cs.user_id = s.user_id), '[]'::jsonb)
        ) as j
      from public.adult_staff s join auth.users u on u.id = s.user_id
    ) x), '[]'::jsonb);
end $$;

-- ---------- name and phone of a staff member ----------
create or replace function public.adult_admin_set_staff_profile(p_user uuid, p_name text, p_phone text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_name text := btrim(coalesce(p_name, '')); v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if char_length(v_name) not between 1 and 80 then raise exception 'bad name' using errcode = 'P0001'; end if;
  if v_phone is not null and v_phone !~ '^\+[0-9]{10,15}$' then raise exception 'bad phone' using errcode = 'P0001'; end if;
  begin
    update public.adult_staff set full_name = v_name, phone = v_phone where user_id = p_user;
  exception when unique_violation then raise exception 'phone already used' using errcode = 'P0001';
  end;
  if not found then raise exception 'no such staff' using errcode = 'P0001'; end if;
  perform public.adult_log('update_staff_profile', null, jsonb_build_object('staff', p_user));
end $$;

-- ---------- suspend / reactivate ----------
create or replace function public.adult_admin_set_staff_active(p_user uuid, p_active boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_staff;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_active is null then raise exception 'bad status' using errcode = 'P0001'; end if;
  if p_user = auth.uid() then raise exception 'cannot change own status' using errcode = 'P0001'; end if;
  select * into s from public.adult_staff where user_id = p_user for update;
  if s.user_id is null then raise exception 'no such staff' using errcode = 'P0001'; end if;
  if not p_active and s.role = 'adult_admin'
     and not exists (select 1 from public.adult_staff o where o.role = 'adult_admin' and o.active and o.user_id <> p_user) then
    raise exception 'last admin' using errcode = 'P0001';
  end if;
  update public.adult_staff
     set active = p_active,
         suspended_at = case when p_active then null else now() end,
         suspended_by = case when p_active then null else auth.uid() end
   where user_id = p_user;
  perform public.adult_log(case when p_active then 'reactivate_staff' else 'suspend_staff' end, null, jsonb_build_object('staff', p_user));
end $$;

-- ---------- assign / unassign / reassign ----------
-- Returns true when a NEW assignment was created, false when the teacher already had that class (no duplicates, no error).
create or replace function public.adult_admin_assign_class(p_user uuid, p_class uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_staff; c public.adult_classes; n integer;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into s from public.adult_staff where user_id = p_user;
  if s.user_id is null then raise exception 'no such staff' using errcode = 'P0001'; end if;
  if s.role <> 'facilitator' then raise exception 'only facilitators' using errcode = 'P0001'; end if;
  if not s.active then raise exception 'staff suspended' using errcode = 'P0001'; end if;
  select * into c from public.adult_classes where id = p_class;
  if c.id is null then raise exception 'no such class' using errcode = 'P0001'; end if;
  if c.status <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  insert into public.adult_class_staff (class_id, user_id, assigned_by) values (p_class, p_user, auth.uid()) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  perform public.adult_log('assign_class', null, jsonb_build_object('class', p_class, 'staff', p_user));
  return true;
end $$;

create or replace function public.adult_admin_unassign_class(p_user uuid, p_class uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.adult_class_staff where class_id = p_class and user_id = p_user;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'not assigned' using errcode = 'P0001'; end if;
  perform public.adult_log('unassign_class', null, jsonb_build_object('class', p_class, 'staff', p_user));
end $$;

-- Moves one teacher from one of their classes to another, in a single transaction (never leaves them with neither).
create or replace function public.adult_admin_reassign_class(p_user uuid, p_from uuid, p_to uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_staff; c public.adult_classes;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_from = p_to then raise exception 'same class' using errcode = 'P0001'; end if;
  select * into s from public.adult_staff where user_id = p_user;
  if s.user_id is null then raise exception 'no such staff' using errcode = 'P0001'; end if;
  if s.role <> 'facilitator' then raise exception 'only facilitators' using errcode = 'P0001'; end if;
  if not s.active then raise exception 'staff suspended' using errcode = 'P0001'; end if;
  select * into c from public.adult_classes where id = p_to;
  if c.id is null then raise exception 'no such class' using errcode = 'P0001'; end if;
  if c.status <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.adult_class_staff where class_id = p_from and user_id = p_user) then raise exception 'not assigned' using errcode = 'P0001'; end if;
  if exists (select 1 from public.adult_class_staff where class_id = p_to and user_id = p_user) then raise exception 'already assigned' using errcode = 'P0001'; end if;
  delete from public.adult_class_staff where class_id = p_from and user_id = p_user;
  insert into public.adult_class_staff (class_id, user_id, assigned_by) values (p_to, p_user, auth.uid());
  perform public.adult_log('reassign_class', null, jsonb_build_object('from_class', p_from, 'class', p_to, 'staff', p_user));
end $$;

-- ---------- what a staff member has done ----------
create or replace function public.adult_admin_staff_activity(p_user uuid, p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'summary', coalesce((select jsonb_object_agg(a.action, a.n)
                         from (select l.action, count(*)::int as n from public.adult_audit_log l
                               where l.actor_id = p_user and l.at > now() - interval '30 days' group by l.action) a), '{}'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc)
                        from (select l.action, l.at, p.full_name as learner_name, c.name as class_name
                              from public.adult_audit_log l
                              left join public.adult_profiles p on p.id = l.learner_id
                              left join public.adult_classes c on c.id = case when (l.details->>'class') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.details->>'class')::uuid end
                              where l.actor_id = p_user order by l.at desc limit v_lim) r), '[]'::jsonb));
end $$;

-- Submissions this staff member has reviewed, plus how many are still waiting in their classes.
create or replace function public.adult_admin_staff_submissions(p_user uuid, p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'reviewed_total', (select count(*)::int from public.adult_feedback f where f.reviewer_id = p_user),
    'waiting', (select count(*)::int from public.adult_submissions s
                join public.adult_assignments a on a.id = s.assignment_id
                join public.adult_class_staff cs on cs.class_id = a.class_id and cs.user_id = p_user
                where s.status = 'submitted'),
    'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.reviewed_at desc)
                        from (select s.id, a.title as assignment, c.name as class_name, pr.full_name as learner_name,
                                     s.submitted_at, s.status, f.score, a.max_score, f.request_redo as redo, f.updated_at as reviewed_at
                              from public.adult_feedback f
                              join public.adult_submissions s on s.id = f.submission_id
                              join public.adult_assignments a on a.id = s.assignment_id
                              join public.adult_classes c on c.id = a.class_id
                              join public.adult_profiles pr on pr.id = s.learner_id
                              where f.reviewer_id = p_user order by f.updated_at desc limit v_lim) r), '[]'::jsonb));
end $$;

-- ---------- only signed-in users may call these (and each one re-checks that the caller is an ACTIVE adult admin) ----------
do $$
declare f text;
begin
  foreach f in array array[
    'adult_admin_list_staff()','adult_admin_set_staff_profile(uuid,text,text)','adult_admin_set_staff_active(uuid,boolean)',
    'adult_admin_assign_class(uuid,uuid)','adult_admin_unassign_class(uuid,uuid)','adult_admin_reassign_class(uuid,uuid,uuid)',
    'adult_admin_staff_activity(uuid,integer)','adult_admin_staff_submissions(uuid,integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
