-- ASARTUN ADULT LEARNING — Migration 018: initial assessment.  DRAFT FOR REVIEW — not executed anywhere.
-- Prerequisite: 017.  Only adds objects.
--
-- The recommendation is ADVISORY. It is computed in the app (src/adult/assessment.js, covered by tests) and stored with the
-- raw answers, so a facilitator can always see what the learner actually did. A result entered by the learner alone is
-- flagged needs_confirmation until a facilitator runs or repeats the assessment with them.

create table if not exists public.adult_assessments (
  id                 uuid primary key default gen_random_uuid(),
  learner_id         uuid not null references public.adult_profiles(id) on delete cascade,
  taken_by           uuid references auth.users(id) on delete set null,
  mode               text not null check (mode in ('self','assisted')),
  client_uuid        uuid not null,                       -- makes a retry after a network failure harmless
  items              jsonb not null,
  scores             jsonb not null,
  recommended        jsonb not null,
  needs_confirmation boolean not null,
  created_at         timestamptz not null default now(),
  unique (learner_id, client_uuid)
);
create index if not exists adult_assessments_learner_idx on public.adult_assessments (learner_id, created_at desc);

alter table public.adult_assessments enable row level security;
drop policy if exists "adult_assessments: own or staff" on public.adult_assessments;
create policy "adult_assessments: own or staff" on public.adult_assessments for select to authenticated
  using (learner_id = auth.uid() or public.staff_can_see_learner(learner_id));
revoke all on public.adult_assessments from anon, authenticated;
grant select on public.adult_assessments to authenticated;

-- Save an assessment. p_learner = null (or the caller) means "I am the learner"; otherwise the caller must be staff
-- who may see that learner. Validates shape so junk cannot be stored.
create or replace function public.adult_submit_assessment(p_learner uuid, p_client uuid, p_mode text,
                                                          p_items jsonb, p_scores jsonb, p_recommended jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_learner uuid := coalesce(p_learner, auth.uid()); v_staff boolean; v_id uuid; it jsonb;
begin
  v_staff := v_learner <> auth.uid();
  if v_staff then
    if not public.staff_can_see_learner(v_learner) then raise exception 'not authorized' using errcode = '42501'; end if;
  elsif not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_mode not in ('self','assisted') or (v_staff and p_mode <> 'assisted') or (not v_staff and p_mode <> 'self') then
    raise exception 'bad mode' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40
     or jsonb_typeof(p_scores) <> 'object' or jsonb_typeof(p_recommended) <> 'object' or p_client is null then
    raise exception 'bad assessment' using errcode = 'P0001';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or (it->>'id') !~ '^[a-z0-9_]{1,30}$'
       or (it->>'result') not in ('yes','help','no','skipped') or (it->>'source') not in ('auto','self','staff') then
      raise exception 'bad assessment item' using errcode = 'P0001';
    end if;
  end loop;
  if pg_column_size(p_items) + pg_column_size(p_scores) + pg_column_size(p_recommended) > 20000 then
    raise exception 'assessment too large' using errcode = 'P0001';
  end if;
  -- no more than 6 per learner per day (counts retries of the same client_uuid only once)
  if (select count(*) from public.adult_assessments where learner_id = v_learner and created_at > now() - interval '1 day') >= 6
     and not exists (select 1 from public.adult_assessments where learner_id = v_learner and client_uuid = p_client) then
    raise exception 'too many assessments today' using errcode = 'P0001';
  end if;
  insert into public.adult_assessments (learner_id, taken_by, mode, client_uuid, items, scores, recommended, needs_confirmation)
  values (v_learner, auth.uid(), p_mode, p_client, p_items, p_scores, p_recommended, not v_staff)
  on conflict (learner_id, client_uuid) do nothing
  returning id into v_id;
  if v_id is null then select id into v_id from public.adult_assessments where learner_id = v_learner and client_uuid = p_client; end if;
  if v_staff then perform public.adult_log('assisted_assessment', v_learner, jsonb_build_object('assessment', v_id)); end if;
  return v_id;
end $$;

-- One learner's file for staff. Logged every time it is opened.
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
                                from public.adult_assessments where learner_id = p_learner order by created_at desc limit 3) a), '[]'::jsonb));
end $$;

do $$
declare f text;
begin
  foreach f in array array['adult_submit_assessment(uuid,uuid,text,jsonb,jsonb,jsonb)','adult_staff_learner_detail(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
