-- ASARTUN ADULT LEARNING — Migration 019: lesson progress (Phase 4).  DRAFT FOR REVIEW — not executed anywhere.
-- Prerequisite: 017, 018.  Only adds one table and functions; replaces ONE function of our own (adult_staff_learner_detail)
-- with the same signature so staff also see lesson progress.
--
-- The curriculum itself lives in the app (src/adult/curriculum.js), so this table is keyed by a lesson key, not by a lesson row.
-- What is stored is not just "completed": it also keeps how well the tracing followed the guide, how the learner rated their own
-- independent writing, and the result of the reading choices — so "finished" is never the only measure of success.

create table if not exists public.adult_lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  learner_id   uuid not null references public.adult_profiles(id) on delete cascade,
  course_id    uuid not null references public.adult_courses(id) on delete cascade,
  lesson_key   text not null check (lesson_key ~ '^[a-z0-9-]{1,40}$'),
  status       text not null default 'started' check (status in ('started','completed')),
  attempts     integer not null default 0 check (attempts >= 0),           -- finished runs of the lesson
  best_trace   numeric(3,2) check (best_trace between 0 and 1),
  last_trace   numeric(3,2) check (last_trace between 0 and 1),
  write_rating text check (write_rating in ('yes','help','no')),            -- the learner's (or facilitator's) own judgement of independent writing
  last_results jsonb not null default '{}'::jsonb,
  last_client  uuid,                                                        -- a retry of the same run is not counted twice
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (learner_id, course_id, lesson_key)
);
create index if not exists adult_lesson_progress_learner_idx on public.adult_lesson_progress (learner_id, updated_at desc);

alter table public.adult_lesson_progress enable row level security;
drop policy if exists "adult_lesson_progress: own or staff" on public.adult_lesson_progress;
create policy "adult_lesson_progress: own or staff" on public.adult_lesson_progress for select to authenticated
  using (learner_id = auth.uid() or public.staff_can_see_learner(learner_id));
revoke all on public.adult_lesson_progress from anon, authenticated;
grant select on public.adult_lesson_progress to authenticated;

-- Record one run of a lesson. The learner must be enrolled in the course (and the enrolment not expired).
create or replace function public.adult_record_lesson(p_course uuid, p_lesson text, p_client uuid, p_status text, p_results jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r public.adult_lesson_progress; k text; v jsonb; tr numeric; wr text;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.adult_enrollments e where e.learner_id = auth.uid() and e.course_id = p_course
                   and (e.ends_at is null or e.ends_at > now())) then
    raise exception 'not enrolled' using errcode = '42501';
  end if;
  if p_lesson is null or p_lesson !~ '^[a-z0-9-]{1,40}$' or p_status not in ('started','completed') or p_client is null
     or jsonb_typeof(p_results) <> 'object' or pg_column_size(p_results) > 2000 then
    raise exception 'bad progress' using errcode = 'P0001';
  end if;
  for k, v in select * from jsonb_each(p_results) loop
    if k in ('trace') and not (jsonb_typeof(v) = 'null' or (jsonb_typeof(v) = 'number' and (v#>>'{}')::numeric between 0 and 1)) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    if k in ('write') and not (jsonb_typeof(v) = 'null' or (v#>>'{}') in ('yes','help','no')) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    if k in ('match','find') and not (jsonb_typeof(v) = 'null' or (v#>>'{}') in ('yes','no')) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    if k in ('steps','traceTries') and not (jsonb_typeof(v) = 'number' and (v#>>'{}')::numeric between 0 and 50) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    if k not in ('trace','write','match','find','steps','traceTries') then raise exception 'bad progress' using errcode = 'P0001'; end if;
  end loop;
  tr := case when jsonb_typeof(p_results->'trace') = 'number' then (p_results->>'trace')::numeric end;
  wr := case when (p_results->>'write') in ('yes','help','no') then p_results->>'write' end;

  select * into r from public.adult_lesson_progress where learner_id = auth.uid() and course_id = p_course and lesson_key = p_lesson;
  if r.id is not null and r.last_client = p_client then
    return jsonb_build_object('status', r.status, 'attempts', r.attempts);       -- same run sent again (network retry)
  end if;
  if r.id is null then
    insert into public.adult_lesson_progress (learner_id, course_id, lesson_key, status, attempts, best_trace, last_trace, write_rating, last_results, last_client, completed_at)
    values (auth.uid(), p_course, p_lesson, p_status, case when p_status = 'completed' then 1 else 0 end, tr, tr, wr, p_results, p_client,
            case when p_status = 'completed' then now() end)
    returning * into r;
  else
    update public.adult_lesson_progress set
      status = case when r.status = 'completed' then 'completed' else p_status end,         -- never goes back from completed
      attempts = r.attempts + case when p_status = 'completed' then 1 else 0 end,
      best_trace = case when tr is null then r.best_trace else greatest(coalesce(r.best_trace, 0), tr) end,
      last_trace = coalesce(tr, r.last_trace),
      write_rating = coalesce(wr, r.write_rating),
      last_results = p_results, last_client = p_client, updated_at = now(),
      completed_at = coalesce(r.completed_at, case when p_status = 'completed' then now() end)
    where id = r.id returning * into r;
  end if;
  return jsonb_build_object('status', r.status, 'attempts', r.attempts);
end $$;

-- Same as in 018, plus the learner's lesson progress.
create or replace function public.adult_staff_learner_detail(p_learner uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.staff_can_see_learner(p_learner) then raise exception 'not authorized' using errcode = '42501'; end if;
  perform public.adult_log('view_learner', p_learner, '{}'::jsonb);
  return jsonb_build_object(
    'profile', (select to_jsonb(p) - 'consent_at' from public.adult_profiles p where p.id = p_learner),
    'classes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)) from public.adult_class_members m
                         join public.adult_classes c on c.id = m.class_id where m.learner_id = p_learner and m.left_at is null), '[]'::jsonb),
    'enrollments', coalesce((select jsonb_agg(jsonb_build_object('course', e.course_id, 'source', e.source, 'since', e.created_at))
                             from public.adult_enrollments e where e.learner_id = p_learner), '[]'::jsonb),
    'assessments', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from
                             (select id, mode, items, scores, recommended, needs_confirmation, created_at
                                from public.adult_assessments where learner_id = p_learner order by created_at desc limit 3) a), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(to_jsonb(g) order by g.updated_at desc) from
                          (select lesson_key, status, attempts, best_trace, last_trace, write_rating, last_results, updated_at
                             from public.adult_lesson_progress where learner_id = p_learner order by updated_at desc limit 200) g), '[]'::jsonb));
end $$;

revoke all on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) from public, anon;
grant execute on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) to authenticated;
