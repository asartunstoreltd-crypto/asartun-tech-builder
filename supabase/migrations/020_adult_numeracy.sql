-- ASARTUN ADULT LEARNING — Migration 020: numeracy evidence and facilitator skill checks (Phase 5).  DRAFT FOR REVIEW — not executed anywhere.
-- Prerequisite: 017, 018, 019.  Nothing is dropped. It
--   1. adds two columns to our own adult_lesson_progress (Phase 4):  best_quiz, last_calc_self
--   2. REPLACES adult_record_lesson (same signature) so it accepts five more result counts, checks they are consistent, and keeps the two columns
--   3. adds adult_skill_checks + adult_staff_confirm_skill: a facilitator records "I watched this learner do it" per skill area
--   4. REPLACES adult_staff_learner_detail (same signature) to include the new columns and the skill checks
--
-- Why two signals: "lesson finished" is not "can calculate". Written answers are marked by the learner (the app never reads handwriting) and
-- are only an opinion; multiple-choice questions are marked by the app. best_quiz is the best objective result, last_calc_self the learner's own
-- view of the last run. Only a row in adult_skill_checks (written by a facilitator) counts as confirmed by a person.

alter table public.adult_lesson_progress add column if not exists best_quiz      numeric(3,2) check (best_quiz between 0 and 1);
alter table public.adult_lesson_progress add column if not exists last_calc_self numeric(3,2) check (last_calc_self between 0 and 1);

-- ---------- facilitator skill checks ----------
create table if not exists public.adult_skill_checks (
  id         uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.adult_profiles(id) on delete cascade,
  skill      text not null check (skill in ('numbers','add_sub','mult_div','money')),
  result     text not null check (result in ('can','with_help','not_yet')),
  note       text check (note is null or char_length(note) <= 300),
  checked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists adult_skill_checks_learner_idx on public.adult_skill_checks (learner_id, skill, created_at desc);

alter table public.adult_skill_checks enable row level security;
drop policy if exists "adult_skill_checks: own or staff" on public.adult_skill_checks;
create policy "adult_skill_checks: own or staff" on public.adult_skill_checks for select to authenticated
  using (learner_id = auth.uid() or public.staff_can_see_learner(learner_id));
revoke all on public.adult_skill_checks from anon, authenticated;
grant select on public.adult_skill_checks to authenticated;

-- Only staff who may see this learner (adult admin, or a facilitator of the learner's class) can record a check.
create or replace function public.adult_staff_confirm_skill(p_learner uuid, p_skill text, p_result text, p_note text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_learner is null or not public.staff_can_see_learner(p_learner) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_skill not in ('numbers','add_sub','mult_div','money') or p_result not in ('can','with_help','not_yet')
     or (p_note is not null and char_length(p_note) > 300) then
    raise exception 'bad skill check' using errcode = 'P0001';
  end if;
  insert into public.adult_skill_checks (learner_id, skill, result, note, checked_by)
  values (p_learner, p_skill, p_result, nullif(btrim(p_note), ''), auth.uid()) returning id into v_id;
  perform public.adult_log('skill_check', p_learner, jsonb_build_object('skill', p_skill, 'result', p_result));
  return v_id;
end $$;

-- ---------- record one run of a lesson (replaces the Phase 4 version; same signature) ----------
create or replace function public.adult_record_lesson(p_course uuid, p_lesson text, p_client uuid, p_status text, p_results jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r public.adult_lesson_progress; k text; v jsonb; tr numeric; wr text; qn integer; qr integer; cn integer; cy integer; ch integer; bq numeric; cs numeric;
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
    if k in ('steps','traceTries','calcN','calcYes','calcHelp','quizN','quizRight') then          -- whole numbers 0..50 (checked in this order: no cast of junk)
      if jsonb_typeof(v) <> 'number' or (v#>>'{}') !~ '^[0-9]{1,2}$' then raise exception 'bad progress' using errcode = 'P0001'; end if;
      if (v#>>'{}')::integer > 50 then raise exception 'bad progress' using errcode = 'P0001'; end if;
    end if;
    if k not in ('trace','write','match','find','steps','traceTries','calcN','calcYes','calcHelp','quizN','quizRight') then raise exception 'bad progress' using errcode = 'P0001'; end if;
  end loop;
  cn := coalesce((p_results->>'calcN')::integer, 0); cy := coalesce((p_results->>'calcYes')::integer, 0); ch := coalesce((p_results->>'calcHelp')::integer, 0);
  qn := coalesce((p_results->>'quizN')::integer, 0); qr := coalesce((p_results->>'quizRight')::integer, 0);
  if cy + ch > cn or qr > qn then raise exception 'bad progress' using errcode = 'P0001'; end if;     -- more right than asked is impossible
  tr := case when jsonb_typeof(p_results->'trace') = 'number' then (p_results->>'trace')::numeric end;
  wr := case when (p_results->>'write') in ('yes','help','no') then p_results->>'write' end;
  bq := case when qn > 0 then round(qr::numeric / qn, 2) end;
  cs := case when cn > 0 then round((cy + 0.5 * ch) / cn, 2) end;                                       -- the learner's own opinion, kept apart from bq

  select * into r from public.adult_lesson_progress where learner_id = auth.uid() and course_id = p_course and lesson_key = p_lesson;
  if r.id is not null and r.last_client = p_client then
    return jsonb_build_object('status', r.status, 'attempts', r.attempts);       -- same run sent again (network retry)
  end if;
  if r.id is null then
    insert into public.adult_lesson_progress (learner_id, course_id, lesson_key, status, attempts, best_trace, last_trace, write_rating, best_quiz, last_calc_self, last_results, last_client, completed_at)
    values (auth.uid(), p_course, p_lesson, p_status, case when p_status = 'completed' then 1 else 0 end, tr, tr, wr, bq, cs, p_results, p_client,
            case when p_status = 'completed' then now() end)
    returning * into r;
  else
    update public.adult_lesson_progress set
      status = case when r.status = 'completed' then 'completed' else p_status end,         -- never goes back from completed
      attempts = r.attempts + case when p_status = 'completed' then 1 else 0 end,
      best_trace = case when tr is null then r.best_trace else greatest(coalesce(r.best_trace, 0), tr) end,
      last_trace = coalesce(tr, r.last_trace),
      write_rating = coalesce(wr, r.write_rating),
      best_quiz = case when bq is null then r.best_quiz else greatest(coalesce(r.best_quiz, 0), bq) end,
      last_calc_self = coalesce(cs, r.last_calc_self),
      last_results = p_results, last_client = p_client, updated_at = now(),
      completed_at = coalesce(r.completed_at, case when p_status = 'completed' then now() end)
    where id = r.id returning * into r;
  end if;
  return jsonb_build_object('status', r.status, 'attempts', r.attempts);
end $$;

-- ---------- staff view of one learner (replaces the 019 version; same signature): adds quiz/self columns and skill checks ----------
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
                          (select lesson_key, status, attempts, best_trace, last_trace, write_rating, best_quiz, last_calc_self, last_results, updated_at
                             from public.adult_lesson_progress where learner_id = p_learner order by updated_at desc limit 200) g), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(to_jsonb(s)) from
                        (select distinct on (skill) skill, result, note, created_at
                           from public.adult_skill_checks where learner_id = p_learner order by skill, created_at desc) s), '[]'::jsonb));
end $$;

revoke all on function public.adult_staff_confirm_skill(uuid,text,text,text) from public, anon;
grant execute on function public.adult_staff_confirm_skill(uuid,text,text,text) to authenticated;
revoke all on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) from public, anon;
grant execute on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) to authenticated;
revoke all on function public.adult_staff_learner_detail(uuid) from public, anon;
grant execute on function public.adult_staff_learner_detail(uuid) to authenticated;
