-- ASARTUN ADULT LEARNING — Migration 021: assignments, saved handwriting, photo submissions, teacher feedback (Phase 6).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-020.  Only ADDS objects (one column on our adult_classes).
--
-- * Handwriting is saved as vector strokes (a few KB). Photos go to the PRIVATE bucket "adult-submissions" under <learner id>/.
-- * A learner may read/write only their own folder. A facilitator may read a photo only if it belongs to a submission for an
--   assignment of a class they manage (adult_staff_can_see_file).
-- * One live submission per learner per assignment: sending again replaces the earlier attempt (it becomes 'superseded');
--   after a teacher has marked it, another attempt is possible only when the teacher asked for one ('redo').
-- * The same upload sent twice (network retry) is stored once (client_uuid).
-- * Retention: 2 months after a class is closed. Deleting the files needs the storage API, so it is done by the Edge Function
--   adult-purge (using adult_expired_submissions / adult_purge_delete below), NOT by deleting rows in SQL.

alter table public.adult_classes add column if not exists closed_at timestamptz;

create table if not exists public.adult_assignments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.adult_classes(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  instructions text not null default '' check (char_length(instructions) <= 2000),
  kind         text not null default 'either' check (kind in ('handwriting','photo','either')),
  lesson_key   text check (lesson_key is null or lesson_key ~ '^[a-z0-9-]{1,40}$'),
  due_at       timestamptz,
  max_score    integer not null default 10 check (max_score between 1 and 100),
  status       text not null default 'open' check (status in ('open','closed')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists adult_assignments_class_idx on public.adult_assignments (class_id, created_at desc);

create table if not exists public.adult_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.adult_assignments(id) on delete cascade,
  learner_id    uuid not null references public.adult_profiles(id) on delete cascade,
  attempt_no    integer not null check (attempt_no between 1 and 5),
  kind          text not null check (kind in ('handwriting','photo')),
  strokes       jsonb,
  aspect        numeric(4,2) check (aspect is null or aspect between 0.3 and 4),
  file_path     text,
  mime          text check (mime is null or mime in ('image/jpeg','image/png','image/webp')),
  bytes         integer check (bytes is null or bytes between 1 and 1572864),
  client_uuid   uuid not null,
  status        text not null default 'submitted' check (status in ('submitted','reviewed','redo','superseded')),
  submitted_at  timestamptz not null default now(),
  unique (learner_id, assignment_id, attempt_no),
  unique (learner_id, client_uuid),
  check ((kind = 'handwriting' and strokes is not null and file_path is null) or (kind = 'photo' and file_path is not null and strokes is null))
);
create index if not exists adult_submissions_assignment_idx on public.adult_submissions (assignment_id, status, submitted_at);
create index if not exists adult_submissions_learner_idx on public.adult_submissions (learner_id, submitted_at desc);

create table if not exists public.adult_feedback (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.adult_submissions(id) on delete cascade,
  reviewer_id   uuid references auth.users(id) on delete set null,
  score         numeric(5,2) check (score is null or score >= 0),
  comment       text check (comment is null or char_length(comment) <= 2000),
  corrections   jsonb not null default '[]'::jsonb,                 -- teacher's marks: [{tool:'pen'|'highlight', w, pts:[[x,y]..]}] in 0..1 coordinates
  request_redo  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- helpers ----------
create or replace function public.adult_can_manage_assignment(p_assignment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_assignments a where a.id = p_assignment and public.adult_can_manage_class(a.class_id));
$$;
create or replace function public.adult_learner_in_assignment_class(p_assignment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_assignments a join public.adult_class_members m on m.class_id = a.class_id
                 where a.id = p_assignment and m.learner_id = auth.uid() and m.left_at is null);
$$;
create or replace function public.adult_feedback_visible(p_submission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_submissions s join public.adult_assignments a on a.id = s.assignment_id
                 where s.id = p_submission and (s.learner_id = auth.uid() or public.adult_can_manage_class(a.class_id)));
$$;
create or replace function public.adult_staff_can_see_file(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_submissions s where s.file_path = p_path and public.adult_can_manage_assignment(s.assignment_id));
$$;

-- ---------- Row Level Security ----------
alter table public.adult_assignments enable row level security;
alter table public.adult_submissions enable row level security;
alter table public.adult_feedback    enable row level security;

drop policy if exists "adult_assignments: class members and staff" on public.adult_assignments;
create policy "adult_assignments: class members and staff" on public.adult_assignments for select to authenticated
  using (public.adult_can_manage_class(class_id) or public.adult_learner_in_assignment_class(id));
drop policy if exists "adult_submissions: own or class staff" on public.adult_submissions;
create policy "adult_submissions: own or class staff" on public.adult_submissions for select to authenticated
  using (learner_id = auth.uid() or public.adult_can_manage_assignment(assignment_id));
drop policy if exists "adult_feedback: own work or class staff" on public.adult_feedback;
create policy "adult_feedback: own work or class staff" on public.adult_feedback for select to authenticated
  using (public.adult_feedback_visible(submission_id));

revoke all on public.adult_assignments, public.adult_submissions, public.adult_feedback from anon, authenticated;
grant select on public.adult_assignments, public.adult_submissions, public.adult_feedback to authenticated;

-- ---------- private photo bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adult-submissions', 'adult-submissions', false, 1572864, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "adult-submissions: learner uploads own" on storage.objects;
create policy "adult-submissions: learner uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'adult-submissions' and public.is_adult_learner() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "adult-submissions: read own or class staff" on storage.objects;
create policy "adult-submissions: read own or class staff" on storage.objects for select to authenticated
  using (bucket_id = 'adult-submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.adult_staff_can_see_file(name)));
drop policy if exists "adult-submissions: learner deletes own" on storage.objects;
create policy "adult-submissions: learner deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'adult-submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- staff: assignments and classes ----------
create or replace function public.adult_create_assignment(p_class uuid, p_title text, p_instructions text, p_kind text, p_lesson text, p_due timestamptz, p_max integer) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.adult_classes where id = p_class and status = 'active') then raise exception 'class is closed' using errcode = 'P0001'; end if;
  insert into public.adult_assignments (class_id, title, instructions, kind, lesson_key, due_at, max_score, created_by)
  values (p_class, btrim(p_title), coalesce(p_instructions, ''), p_kind, nullif(p_lesson, ''), p_due, coalesce(p_max, 10), auth.uid()) returning id into v;
  perform public.adult_log('create_assignment', null, jsonb_build_object('assignment', v, 'class', p_class));
  return v;
end $$;

create or replace function public.adult_set_assignment_status(p_id uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_status not in ('open','closed') then raise exception 'bad status' using errcode = 'P0001'; end if;
  if not public.adult_can_manage_assignment(p_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.adult_assignments set status = p_status where id = p_id;
end $$;

-- Closing a class starts the 2-month retention clock for its submissions.
create or replace function public.adult_close_class(p_class uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.adult_can_manage_class(p_class) then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.adult_classes set status = 'closed', closed_at = coalesce(closed_at, now()) where id = p_class;
  update public.adult_assignments set status = 'closed' where class_id = p_class;
  perform public.adult_log('close_class', null, jsonb_build_object('class', p_class));
end $$;

-- Assignments of the classes the caller manages, with counts of work waiting / marked.
create or replace function public.adult_staff_assignments() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select a.id, a.class_id, c.name as class_name, a.title, a.kind, a.due_at, a.max_score, a.status, a.created_at,
           (select count(*) from public.adult_submissions s where s.assignment_id = a.id and s.status = 'submitted') as waiting,
           (select count(*) from public.adult_submissions s where s.assignment_id = a.id and s.status = 'reviewed') as marked,
           (select count(*) from public.adult_submissions s where s.assignment_id = a.id and s.status = 'redo') as redo
      from public.adult_assignments a join public.adult_classes c on c.id = a.class_id
     where public.adult_can_manage_class(a.class_id) order by a.created_at desc limit 200) x), '[]'::jsonb);
end $$;

-- ---------- learner: send work ----------
create or replace function public.adult_submit_work(p_assignment uuid, p_client uuid, p_kind text, p_strokes jsonb, p_aspect numeric,
                                                    p_file text, p_mime text, p_bytes integer) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare a public.adult_assignments; latest public.adult_submissions; s public.adult_submissions; st jsonb;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into a from public.adult_assignments where id = p_assignment;
  if a.id is null or not public.adult_learner_in_assignment_class(a.id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_client is null or p_kind not in ('handwriting','photo') then raise exception 'bad submission' using errcode = 'P0001'; end if;

  select * into s from public.adult_submissions where learner_id = auth.uid() and client_uuid = p_client;       -- same upload sent again
  if s.id is not null then return jsonb_build_object('id', s.id, 'attempt_no', s.attempt_no, 'status', s.status); end if;

  if a.status <> 'open' then raise exception 'assignment closed' using errcode = 'P0001'; end if;
  if a.kind <> 'either' and a.kind <> p_kind then raise exception 'wrong kind' using errcode = 'P0001'; end if;

  if p_kind = 'handwriting' then
    if p_file is not null or p_strokes is null or jsonb_typeof(p_strokes) <> 'array' or jsonb_array_length(p_strokes) not between 1 and 300
       or pg_column_size(p_strokes) > 300000 or p_aspect is null or p_aspect not between 0.3 and 4 then
      raise exception 'bad handwriting' using errcode = 'P0001';
    end if;
    for st in select * from jsonb_array_elements(p_strokes) loop
      if jsonb_typeof(st) <> 'object' or (st->>'tool') <> 'pen' or jsonb_typeof(st->'pts') <> 'array' or jsonb_array_length(st->'pts') not between 1 and 4000 then
        raise exception 'bad handwriting' using errcode = 'P0001';
      end if;
    end loop;
  else
    if p_strokes is not null or p_file is null or p_mime not in ('image/jpeg','image/png','image/webp') or p_bytes is null or p_bytes not between 1 and 1572864
       or p_file !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
      raise exception 'bad photo' using errcode = 'P0001';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'adult-submissions' and o.name = p_file) then
      raise exception 'photo not uploaded' using errcode = 'P0001';
    end if;
  end if;

  select * into latest from public.adult_submissions where learner_id = auth.uid() and assignment_id = a.id order by attempt_no desc limit 1;
  if latest.id is not null then
    if latest.status = 'reviewed' then raise exception 'already marked' using errcode = 'P0001'; end if;       -- needs the teacher to ask for another attempt
    if latest.attempt_no >= 5 then raise exception 'too many attempts' using errcode = 'P0001'; end if;
    update public.adult_submissions set status = 'superseded' where id = latest.id and status = 'submitted';
  end if;
  insert into public.adult_submissions (assignment_id, learner_id, attempt_no, kind, strokes, aspect, file_path, mime, bytes, client_uuid)
  values (a.id, auth.uid(), coalesce(latest.attempt_no, 0) + 1, p_kind, p_strokes, p_aspect, p_file, p_mime, p_bytes, p_client)
  returning * into s;
  return jsonb_build_object('id', s.id, 'attempt_no', s.attempt_no, 'status', s.status);
end $$;

-- ---------- staff: review ----------
create or replace function public.adult_staff_review_queue(p_status text default 'submitted') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('submitted','redo','reviewed') then raise exception 'bad status' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.submitted_at) from (
    select s.id, s.kind, s.attempt_no, s.status, s.submitted_at, p.full_name as learner_name, a.id as assignment_id, a.title as assignment_title, a.due_at,
           (a.due_at is not null and s.submitted_at > a.due_at) as late
      from public.adult_submissions s join public.adult_assignments a on a.id = s.assignment_id join public.adult_profiles p on p.id = s.learner_id
     where s.status = p_status and public.adult_can_manage_class(a.class_id) order by s.submitted_at limit 200) x), '[]'::jsonb);
end $$;

create or replace function public.adult_staff_submission(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb;
begin
  if not exists (select 1 from public.adult_submissions s where s.id = p_id and public.adult_can_manage_assignment(s.assignment_id)) then raise exception 'not authorized' using errcode = '42501'; end if;
  select jsonb_build_object(
    'submission', to_jsonb(s), 'learner_name', p.full_name,
    'assignment', jsonb_build_object('id', a.id, 'title', a.title, 'instructions', a.instructions, 'max_score', a.max_score, 'due_at', a.due_at, 'kind', a.kind),
    'feedback', (select to_jsonb(f) from public.adult_feedback f where f.submission_id = s.id))
    into r from public.adult_submissions s join public.adult_assignments a on a.id = s.assignment_id join public.adult_profiles p on p.id = s.learner_id where s.id = p_id;
  perform public.adult_log('view_submission', (r->'submission'->>'learner_id')::uuid, jsonb_build_object('submission', p_id));
  return r;
end $$;

create or replace function public.adult_review_submission(p_submission uuid, p_score numeric, p_comment text, p_corrections jsonb, p_redo boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare s public.adult_submissions; a public.adult_assignments; c jsonb;
begin
  select * into s from public.adult_submissions where id = p_submission;
  if s.id is null or not public.adult_can_manage_assignment(s.assignment_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if s.status = 'superseded' then raise exception 'older attempt' using errcode = 'P0001'; end if;
  select * into a from public.adult_assignments where id = s.assignment_id;
  p_corrections := coalesce(p_corrections, '[]'::jsonb);
  if p_score is not null and (p_score < 0 or p_score > a.max_score) then raise exception 'bad score' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_comment, '')) > 2000 or jsonb_typeof(p_corrections) <> 'array' or jsonb_array_length(p_corrections) > 200 or pg_column_size(p_corrections) > 300000 then
    raise exception 'bad feedback' using errcode = 'P0001';
  end if;
  for c in select * from jsonb_array_elements(p_corrections) loop
    if jsonb_typeof(c) <> 'object' or (c->>'tool') not in ('pen','highlight') or jsonb_typeof(c->'pts') <> 'array' or jsonb_array_length(c->'pts') > 4000 then
      raise exception 'bad feedback' using errcode = 'P0001';
    end if;
  end loop;
  insert into public.adult_feedback (submission_id, reviewer_id, score, comment, corrections, request_redo)
  values (s.id, auth.uid(), p_score, nullif(btrim(coalesce(p_comment, '')), ''), p_corrections, coalesce(p_redo, false))
  on conflict (submission_id) do update set reviewer_id = auth.uid(), score = excluded.score, comment = excluded.comment,
     corrections = excluded.corrections, request_redo = excluded.request_redo, updated_at = now();
  update public.adult_submissions set status = case when coalesce(p_redo, false) then 'redo' else 'reviewed' end where id = s.id;
  perform public.adult_log('review_submission', s.learner_id, jsonb_build_object('submission', s.id, 'redo', coalesce(p_redo, false)));
end $$;

-- ---------- retention (used only by the Edge Function adult-purge, with the service role) ----------
create or replace function public.adult_expired_submissions() returns table (id uuid, file_path text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.file_path from public.adult_submissions s
    join public.adult_assignments a on a.id = s.assignment_id join public.adult_classes c on c.id = a.class_id
   where c.closed_at is not null and c.closed_at < now() - interval '2 months' limit 500;
$$;
create or replace function public.adult_purge_delete(p_ids uuid[]) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.adult_submissions s using public.adult_assignments a, public.adult_classes c
   where s.id = any(p_ids) and a.id = s.assignment_id and c.id = a.class_id and c.closed_at is not null and c.closed_at < now() - interval '2 months';
  get diagnostics n = row_count;
  return n;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'adult_can_manage_assignment(uuid)','adult_learner_in_assignment_class(uuid)','adult_feedback_visible(uuid)','adult_staff_can_see_file(text)',
    'adult_create_assignment(uuid,text,text,text,text,timestamptz,integer)','adult_set_assignment_status(uuid,text)','adult_close_class(uuid)','adult_staff_assignments()',
    'adult_submit_work(uuid,uuid,text,jsonb,numeric,text,text,integer)','adult_staff_review_queue(text)','adult_staff_submission(uuid)',
    'adult_review_submission(uuid,numeric,text,jsonb,boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- the retention functions are for the service role only
  revoke all on function public.adult_expired_submissions() from public, anon, authenticated;
  revoke all on function public.adult_purge_delete(uuid[]) from public, anon, authenticated;
  grant execute on function public.adult_expired_submissions() to service_role;
  grant execute on function public.adult_purge_delete(uuid[]) to service_role;
end $$;
