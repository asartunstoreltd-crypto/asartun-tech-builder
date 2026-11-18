-- ASARTUN ADULT LEARNING — Migration 022: class sessions, attendance, class schedule, report data (Phase 7).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-021.  Only ADDS objects; no existing table or function is altered.
--
-- * A "session" is one class meeting on one date. Attendance is marked per learner: present / absent / late.
-- * Only staff who manage the class can open sessions or mark attendance (adult_can_manage_class). A learner can read only
--   their own marks. The browser can only SELECT; every write is a security definer function.
-- * The database sends RAW FACTS for reports (progress rows, attendance, latest work per assignment). Every judgement
--   ("needs additional support", skill levels) is made in src/adult/reports.js, where each rule is written down and tested.
-- * Reading a class report is written to adult_audit_log (one row per load, with the class, not per learner).

create table if not exists public.adult_sessions (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.adult_classes(id) on delete cascade,
  session_date date not null,
  note         text check (note is null or char_length(note) <= 200),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (class_id, session_date)
);
create index if not exists adult_sessions_class_idx on public.adult_sessions (class_id, session_date desc);

create table if not exists public.adult_attendance (
  session_id uuid not null references public.adult_sessions(id) on delete cascade,
  learner_id uuid not null references public.adult_profiles(id) on delete cascade,
  status     text not null check (status in ('present','absent','late')),
  marked_by  uuid references auth.users(id) on delete set null,
  marked_at  timestamptz not null default now(),
  primary key (session_id, learner_id)
);
create index if not exists adult_attendance_learner_idx on public.adult_attendance (learner_id);

-- ---------- helper (policies use it) ----------
create or replace function public.adult_can_manage_session(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_sessions s where s.id = p_session and public.adult_can_manage_class(s.class_id));
$$;

-- ---------- Row Level Security: read only ----------
alter table public.adult_sessions   enable row level security;
alter table public.adult_attendance enable row level security;

drop policy if exists "adult_sessions: class staff" on public.adult_sessions;
create policy "adult_sessions: class staff" on public.adult_sessions for select to authenticated
  using (public.adult_can_manage_class(class_id));
-- a facilitator sees attendance only for sessions of classes they manage (NOT for the learner's other classes); a learner sees their own
drop policy if exists "adult_attendance: own or class staff" on public.adult_attendance;
create policy "adult_attendance: own or class staff" on public.adult_attendance for select to authenticated
  using (learner_id = auth.uid() or public.adult_can_manage_session(session_id));

revoke all on public.adult_sessions, public.adult_attendance from anon, authenticated;
grant select on public.adult_sessions, public.adult_attendance to authenticated;

-- ---------- sessions and attendance ----------
-- Open (or find) the session for a date. Calling it twice for the same date returns the same session.
create or replace function public.adult_open_session(p_class uuid, p_date date, p_note text default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v uuid; c public.adult_classes;
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_classes where id = p_class;
  if c.status <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  if p_date is null or p_date < current_date - 366 or p_date > current_date + 1 then raise exception 'bad date' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception 'bad note' using errcode = 'P0001'; end if;
  insert into public.adult_sessions as sx (class_id, session_date, note, created_by) values (p_class, p_date, nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
  on conflict (class_id, session_date) do update set note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), sx.note)
  returning id into v;
  perform public.adult_log('open_session', null, jsonb_build_object('class', p_class, 'date', p_date));
  return v;
end $$;

-- p_marks: [{"learner": "<uuid>", "status": "present"|"absent"|"late"}, ...]. All or nothing.
create or replace function public.adult_mark_attendance(p_session uuid, p_marks jsonb) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_sessions; m jsonb; v_learner uuid; n integer := 0;
begin
  select * into s from public.adult_sessions where id = p_session;
  if s.id is null or not public.adult_can_manage_class(s.class_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if (select status from public.adult_classes where id = s.class_id) <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  if p_marks is null or jsonb_typeof(p_marks) <> 'array' or jsonb_array_length(p_marks) > 300 then raise exception 'bad marks' using errcode = 'P0001'; end if;
  for m in select * from jsonb_array_elements(p_marks) loop
    if jsonb_typeof(m) <> 'object' or (m->>'status') not in ('present','absent','late') or (m->>'learner') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'bad marks' using errcode = 'P0001'; end if;
    v_learner := (m->>'learner')::uuid;
    -- the learner must belong to THIS class (still a member, or left on/after the session date)
    if not exists (select 1 from public.adult_class_members cm where cm.class_id = s.class_id and cm.learner_id = v_learner and (cm.left_at is null or cm.left_at::date >= s.session_date)) then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    insert into public.adult_attendance (session_id, learner_id, status, marked_by) values (s.id, v_learner, m->>'status', auth.uid())
    on conflict (session_id, learner_id) do update set status = excluded.status, marked_by = auth.uid(), marked_at = now();
    n := n + 1;
  end loop;
  perform public.adult_log('mark_attendance', null, jsonb_build_object('session', s.id, 'count', n));
  return n;
end $$;

-- A session opened by mistake can be removed (its marks go with it).
create or replace function public.adult_remove_session(p_session uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_sessions;
begin
  select * into s from public.adult_sessions where id = p_session;
  if s.id is null or not public.adult_can_manage_class(s.class_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if (select status from public.adult_classes where id = s.class_id) <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  delete from public.adult_sessions where id = s.id;
  perform public.adult_log('remove_session', null, jsonb_build_object('class', s.class_id, 'date', s.session_date));
end $$;

-- ---------- class schedule ----------
-- days: 1 = Monday … 7 = Sunday. No days = no fixed schedule. Same rules as scheduleProblem() in src/adult/reports.js.
create or replace function public.adult_set_class_schedule(p_class uuid, p_mode text, p_days integer[], p_start text, p_end text, p_location text, p_note text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare d integer; v_days integer[] := coalesce(p_days, '{}'::integer[]);
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  if (select status from public.adult_classes where id = p_class) <> 'active' then raise exception 'class is closed' using errcode = 'P0001'; end if;
  if p_mode is null or p_mode not in ('physical','online','both') then raise exception 'bad schedule' using errcode = 'P0001'; end if;
  if cardinality(v_days) > 7 or char_length(coalesce(p_location, '')) > 120 or char_length(coalesce(p_note, '')) > 200 then raise exception 'bad schedule' using errcode = 'P0001'; end if;
  foreach d in array v_days loop
    if d is null or d not between 1 and 7 then raise exception 'bad schedule' using errcode = 'P0001'; end if;
  end loop;
  if (select count(distinct x) from unnest(v_days) x) <> cardinality(v_days) then raise exception 'bad schedule' using errcode = 'P0001'; end if;
  if cardinality(v_days) > 0 and (coalesce(p_start, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_end, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_end <= p_start) then
    raise exception 'bad schedule' using errcode = 'P0001';
  end if;
  update public.adult_classes set mode = p_mode, location = nullif(btrim(coalesce(p_location, '')), ''),
    schedule = case when cardinality(v_days) = 0 then jsonb_build_object('note', coalesce(btrim(p_note), ''))
                    else jsonb_build_object('days', to_jsonb((select array_agg(x order by x) from unnest(v_days) x)), 'start', p_start, 'end', p_end, 'note', coalesce(btrim(p_note), '')) end
   where id = p_class;
  perform public.adult_log('set_schedule', null, jsonb_build_object('class', p_class));
end $$;

-- Admin: take a facilitator off a class (the counterpart of adult_admin_assign_facilitator).
create or replace function public.adult_admin_unassign_facilitator(p_class uuid, p_email text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.adult_class_staff cs using auth.users u
   where cs.class_id = p_class and u.id = cs.user_id and lower(u.email) = lower(btrim(p_email));
  get diagnostics n = row_count;
  if n = 0 then raise exception 'no such facilitator on this class' using errcode = 'P0001'; end if;
  perform public.adult_log('unassign_facilitator', null, jsonb_build_object('class', p_class));
end $$;

-- ---------- report data: RAW facts for one class ----------
-- The caller must manage the class. Learners are the CURRENT members. Progress is the learner's whole record (all lessons);
-- attendance and work are limited to THIS class, so a facilitator never sees another class's attendance or work.
create or replace function public.adult_report_data(p_class uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_admin boolean; v_out jsonb;
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  v_admin := public.is_adult_staff(array['adult_admin']);
  if (select count(*) from public.adult_class_members m where m.class_id = p_class and m.left_at is null) > 300 then raise exception 'too many learners' using errcode = 'P0001'; end if;
  select jsonb_build_object(
    'now', now(),
    'class', (select jsonb_build_object('id', c.id, 'name', c.name, 'mode', c.mode, 'location', c.location, 'schedule', c.schedule, 'status', c.status, 'closed_at', c.closed_at)
                from public.adult_classes c where c.id = p_class),
    'staff', case when v_admin then coalesce((select jsonb_agg(u.email order by u.email) from public.adult_class_staff cs join auth.users u on u.id = cs.user_id where cs.class_id = p_class), '[]'::jsonb) else null end,
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'd', s.session_date, 'note', s.note) order by s.session_date desc)
                            from (select * from public.adult_sessions where class_id = p_class order by session_date desc limit 120) s), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due', a.due_at, 'max', a.max_score, 'status', a.status) order by a.created_at)
                               from public.adult_assignments a where a.class_id = p_class), '[]'::jsonb),
    'learners', coalesce((select jsonb_agg(x.l order by x.l->>'name') from (
      select jsonb_build_object(
        'id', p.id, 'name', p.full_name, 'phone', p.phone, 'joined', m.joined_at, 'seen', p.last_active_at,
        'prog', coalesce((select jsonb_agg(jsonb_build_object('k', lp.lesson_key, 's', lp.status, 'a', lp.attempts, 'bt', lp.best_trace, 'bc', lp.best_calc, 'wr', lp.write_rating, 'r', lp.last_results, 'c', lp.completed_at, 'u', lp.updated_at))
                            from public.adult_lesson_progress lp where lp.learner_id = p.id), '[]'::jsonb),
        'att', coalesce((select jsonb_agg(jsonb_build_object('d', s.session_date, 's', att.status))
                           from public.adult_attendance att join public.adult_sessions s on s.id = att.session_id where att.learner_id = p.id and s.class_id = p_class), '[]'::jsonb),
        'subs', coalesce((select jsonb_agg(jsonb_build_object('a', y.assignment_id, 'st', y.status, 'at', y.submitted_at, 'kind', y.kind, 'score', y.score, 'rv', y.rv))
                            from (select distinct on (s.assignment_id) s.assignment_id, s.status, s.submitted_at, s.kind, f.score, f.updated_at as rv
                                    from public.adult_submissions s join public.adult_assignments a on a.id = s.assignment_id
                                    left join public.adult_feedback f on f.submission_id = s.id
                                   where s.learner_id = p.id and a.class_id = p_class and s.status <> 'superseded'
                                   order by s.assignment_id, s.attempt_no desc) y), '[]'::jsonb)
      ) as l
      from public.adult_class_members m join public.adult_profiles p on p.id = m.learner_id
      where m.class_id = p_class and m.left_at is null) x), '[]'::jsonb)
  ) into v_out;
  perform public.adult_log('view_class_report', null, jsonb_build_object('class', p_class));
  return v_out;
end $$;

-- ---------- the learner's own report ----------
create or replace function public.adult_my_report() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'now', now(),
    'prog', coalesce((select jsonb_agg(jsonb_build_object('k', lp.lesson_key, 's', lp.status, 'a', lp.attempts, 'bt', lp.best_trace, 'bc', lp.best_calc, 'wr', lp.write_rating, 'r', lp.last_results, 'c', lp.completed_at, 'u', lp.updated_at))
                        from public.adult_lesson_progress lp where lp.learner_id = auth.uid()), '[]'::jsonb),
    'att', coalesce((select jsonb_agg(jsonb_build_object('d', s.session_date, 's', att.status, 'cls', c.name))
                       from public.adult_attendance att join public.adult_sessions s on s.id = att.session_id join public.adult_classes c on c.id = s.class_id where att.learner_id = auth.uid()), '[]'::jsonb),
    'subs', coalesce((select jsonb_agg(jsonb_build_object('a', y.assignment_id, 't', y.title, 'max', y.max_score, 'st', y.status, 'at', y.submitted_at, 'score', y.score, 'rv', y.rv))
                        from (select distinct on (s.assignment_id) s.assignment_id, a.title, a.max_score, s.status, s.submitted_at,
                                     case when s.status = 'reviewed' then f.score end as score, case when s.status = 'reviewed' then f.updated_at end as rv
                                from public.adult_submissions s join public.adult_assignments a on a.id = s.assignment_id left join public.adult_feedback f on f.submission_id = s.id
                               where s.learner_id = auth.uid() and s.status <> 'superseded'
                               order by s.assignment_id, s.attempt_no desc) y), '[]'::jsonb));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'adult_can_manage_session(uuid)','adult_open_session(uuid,date,text)','adult_mark_attendance(uuid,jsonb)','adult_remove_session(uuid)',
    'adult_set_class_schedule(uuid,text,integer[],text,text,text,text)','adult_admin_unassign_facilitator(uuid,text)','adult_report_data(uuid)','adult_my_report()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
