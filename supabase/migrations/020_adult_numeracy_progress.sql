-- ASARTUN ADULT LEARNING — Migration 020: numeracy results (Phase 5).  DRAFT FOR REVIEW — not executed anywhere.
-- Prerequisite: 017-019.  Adds one column to our own adult_lesson_progress and replaces two of OUR functions (same signatures).
--
-- Handwritten answers are not recognised by the app. For each written calculation the learner (or the facilitator, in a
-- session) says whether their answer was the same as the correct one shown afterwards: calcYes / calcHelp / calcNo.
-- Multiple-choice questions are marked automatically: pickRight of pickTotal.  best_calc = (yes + 0.5 x help) / all written
-- calculations, so "finished the lesson" is never the only measure of whether someone can actually calculate.

alter table public.adult_lesson_progress add column if not exists best_calc numeric(3,2) check (best_calc between 0 and 1);

create or replace function public.adult_record_lesson(p_course uuid, p_lesson text, p_client uuid, p_status text, p_results jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r public.adult_lesson_progress; k text; v jsonb; tr numeric; wr text; cy int; ch int; cn int; calc numeric;
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
    if k = 'trace' then
      if not (jsonb_typeof(v) = 'null' or (jsonb_typeof(v) = 'number' and (v#>>'{}')::numeric between 0 and 1)) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    elsif k = 'write' then
      if not (jsonb_typeof(v) = 'null' or (v#>>'{}') in ('yes','help','no')) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    elsif k in ('match','find') then
      if not (jsonb_typeof(v) = 'null' or (v#>>'{}') in ('yes','no')) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    elsif k in ('steps','traceTries','calcYes','calcHelp','calcNo','pickRight','pickTotal') then
      if not (jsonb_typeof(v) = 'number' and (v#>>'{}')::numeric between 0 and 50 and (v#>>'{}')::numeric = trunc((v#>>'{}')::numeric)) then raise exception 'bad progress' using errcode = 'P0001'; end if;
    else
      raise exception 'bad progress' using errcode = 'P0001';
    end if;
  end loop;
  if coalesce((p_results->>'pickRight')::int, 0) > coalesce((p_results->>'pickTotal')::int, 0) then raise exception 'bad progress' using errcode = 'P0001'; end if;
  tr := case when jsonb_typeof(p_results->'trace') = 'number' then (p_results->>'trace')::numeric end;
  wr := case when (p_results->>'write') in ('yes','help','no') then p_results->>'write' end;
  cy := coalesce((p_results->>'calcYes')::int, 0); ch := coalesce((p_results->>'calcHelp')::int, 0); cn := coalesce((p_results->>'calcNo')::int, 0);
  calc := case when cy + ch + cn > 0 then round((cy + 0.5 * ch) / (cy + ch + cn), 2) end;

  select * into r from public.adult_lesson_progress where learner_id = auth.uid() and course_id = p_course and lesson_key = p_lesson;
  if r.id is not null and r.last_client = p_client then
    return jsonb_build_object('status', r.status, 'attempts', r.attempts);       -- same run sent again (network retry)
  end if;
  if r.id is null then
    insert into public.adult_lesson_progress (learner_id, course_id, lesson_key, status, attempts, best_trace, last_trace, best_calc, write_rating, last_results, last_client, completed_at)
    values (auth.uid(), p_course, p_lesson, p_status, case when p_status = 'completed' then 1 else 0 end, tr, tr, calc, wr, p_results, p_client,
            case when p_status = 'completed' then now() end)
    returning * into r;
  else
    update public.adult_lesson_progress set
      status = case when r.status = 'completed' then 'completed' else p_status end,
      attempts = r.attempts + case when p_status = 'completed' then 1 else 0 end,
      best_trace = case when tr is null then r.best_trace else greatest(coalesce(r.best_trace, 0), tr) end,
      last_trace = coalesce(tr, r.last_trace),
      best_calc = case when calc is null then r.best_calc else greatest(coalesce(r.best_calc, 0), calc) end,
      write_rating = coalesce(wr, r.write_rating),
      last_results = p_results, last_client = p_client, updated_at = now(),
      completed_at = coalesce(r.completed_at, case when p_status = 'completed' then now() end)
    where id = r.id returning * into r;
  end if;
  return jsonb_build_object('status', r.status, 'attempts', r.attempts);
end $$;

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
                          (select lesson_key, status, attempts, best_trace, last_trace, best_calc, write_rating, last_results, updated_at
                             from public.adult_lesson_progress where learner_id = p_learner order by updated_at desc limit 300) g), '[]'::jsonb));
end $$;

revoke all on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) from public, anon;
grant execute on function public.adult_record_lesson(uuid,text,uuid,text,jsonb) to authenticated;
revoke all on function public.adult_staff_learner_detail(uuid) from public, anon;
grant execute on function public.adult_staff_learner_detail(uuid) to authenticated;
