-- ASARTUN ADULT LEARNING — Migration 026: content the adult admin can change without coding (Phase 10).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-025.
--
-- What it adds
--  * adult_texts / adult_text_drafts / adult_text_history: corrections to ANY app text (Hausa or English), saved as a draft by the adult admin and
--    published when ready. A published row replaces the built-in text; deleting it brings the built-in text back. Learners read only published rows.
--  * adult_audio + private storage bucket 'adult-audio': one recording per text key and language (recorded in the dashboard or uploaded).
--  * adult_cms_lessons / adult_cms_lesson_drafts / adult_cms_history: lessons written in the dashboard, for courses created in the dashboard
--    (adult_courses.origin = 'cms'). Four safe step types only, all marked automatically: teaching page, multiple choice, safe-or-scam card, tap-the-place.
--    The lesson text is checked here as well as in the app (adult_cms_valid).
--  * A learner can read a dashboard lesson only with an active enrolment in its course (adult_has_course_access), so a paid course's lessons are not readable
--    without paying. Drafts are readable by the adult admin only.
--  * Changes to things that already exist (flagged on purpose): adult_courses gets two columns and its "kind" check allows 'custom';
--    adult_calc_standard and adult_claim_certificate (migration 024) are REPLACED so a certificate for a dashboard course requires all of its published lessons.
--
-- Only the adult admin can write anything here; browsers can only read (storage uploads of audio are limited by policy to the adult admin).

-- ---------- courses: origin and skill area ----------
alter table public.adult_courses drop constraint if exists adult_courses_kind_check;
alter table public.adult_courses add constraint adult_courses_kind_check check (kind in ('literacy','numeracy','digital','english','custom'));
alter table public.adult_courses add column if not exists origin text not null default 'code' check (origin in ('code','cms'));
alter table public.adult_courses add column if not exists skill_area text check (skill_area is null or skill_area in ('read','count','apply','digital','safety','other'));

-- ---------- texts ----------
create table if not exists public.adult_texts (
  key        text not null check (key ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  lang       text not null check (lang in ('ha','en')),
  value      text not null check (char_length(value) between 1 and 1000 and value !~ '[\x01-\x08\x0b\x0c\x0e-\x1f]'),
  reviewed   boolean not null default false,                       -- a Hausa (or English) speaker has checked this text
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);
create table if not exists public.adult_text_drafts (
  key        text not null check (key ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  lang       text not null check (lang in ('ha','en')),
  value      text not null check (char_length(value) between 1 and 1000 and value !~ '[\x01-\x08\x0b\x0c\x0e-\x1f]'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);
create table if not exists public.adult_text_history (
  id         bigserial primary key,
  key        text not null,
  lang       text not null,
  value      text,
  action     text not null check (action in ('publish','revert','review')),
  by_user    uuid references auth.users(id) on delete set null,
  at         timestamptz not null default now()
);
create index if not exists adult_text_history_idx on public.adult_text_history (key, lang, at desc);

-- ---------- audio ----------
create table if not exists public.adult_audio (
  key         text not null check (key ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  lang        text not null check (lang in ('ha','en')),
  path        text not null,
  mime        text not null check (mime in ('audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-m4a')),
  bytes       integer not null check (bytes between 1 and 3145728),
  duration_ms integer check (duration_ms is null or duration_ms between 1 and 120000),
  text_hash   text not null check (text_hash ~ '^[0-9a-f]{8}$'),    -- fingerprint of the text when it was recorded; if the text changes the clip is skipped until confirmed
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (key, lang)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adult-audio', 'adult-audio', false, 3145728, array['audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-m4a'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "adult-audio: adult users read" on storage.objects;
create policy "adult-audio: adult users read" on storage.objects for select to authenticated
  using (bucket_id = 'adult-audio' and (public.is_adult_learner() or public.is_adult_staff()));
drop policy if exists "adult-audio: admin uploads" on storage.objects;
create policy "adult-audio: admin uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'adult-audio' and public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult-audio: admin replaces" on storage.objects;
create policy "adult-audio: admin replaces" on storage.objects for update to authenticated
  using (bucket_id = 'adult-audio' and public.is_adult_staff(array['adult_admin'])) with check (bucket_id = 'adult-audio' and public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult-audio: admin deletes" on storage.objects;
create policy "adult-audio: admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'adult-audio' and public.is_adult_staff(array['adult_admin']));

-- ---------- dashboard lessons ----------
create table if not exists public.adult_cms_lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.adult_courses(id) on delete cascade,
  key          text not null unique check (key ~ '^x[0-9a-f]{12}$'),      -- progress is stored by this key; it never changes
  position     integer not null default 1,
  unit         jsonb,
  title        jsonb not null,
  content      jsonb not null default '{}'::jsonb,                         -- the PUBLISHED version
  status       text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists adult_cms_lessons_course_idx on public.adult_cms_lessons (course_id, position);
create table if not exists public.adult_cms_lesson_drafts (
  lesson_id  uuid primary key references public.adult_cms_lessons(id) on delete cascade,
  content    jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.adult_cms_history (
  id        bigserial primary key,
  lesson_id uuid not null references public.adult_cms_lessons(id) on delete cascade,
  content   jsonb not null,
  by_user   uuid references auth.users(id) on delete set null,
  at        timestamptz not null default now()
);
create index if not exists adult_cms_history_idx on public.adult_cms_history (lesson_id, at desc);

-- ---------- helpers ----------
create or replace function public.adult_has_course_access(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.adult_enrollments e where e.learner_id = auth.uid() and e.course_id = p_course and (e.ends_at is null or e.ends_at > now()));
$$;

-- {"ha": "...", "en": "..."}: Hausa is required (1..p_max characters), English may be empty; no control characters
create or replace function public.adult_cms_bi(p jsonb, p_max integer) returns boolean
language plpgsql immutable security definer set search_path = '' as $$
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if coalesce(jsonb_typeof(p->'ha'), '') <> 'string' or char_length(p->>'ha') not between 1 and p_max then return false; end if;
  if p ? 'en' and (coalesce(jsonb_typeof(p->'en'), '') <> 'string' or char_length(p->>'en') > p_max) then return false; end if;
  return (p->>'ha') !~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' and coalesce(p->>'en', '') !~ '[\x01-\x08\x0b\x0c\x0e-\x1f]';
end $$;

-- A whole lesson. Mirrored by validateLessonContent() in src/adult/content.js (a test compares the limits).
create or replace function public.adult_cms_valid(p jsonb) returns boolean
language plpgsql immutable security definer set search_path = '' as $$
declare s jsonb; q integer := 0; i integer; ids text[] := '{}'; typ text; n integer; has_dup boolean;
begin
  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 60000 then return false; end if;
  if not public.adult_cms_bi(p->'title', 100) then return false; end if;
  if p ? 'unit' and jsonb_typeof(p->'unit') <> 'null' and not public.adult_cms_bi(p->'unit', 100) then return false; end if;
  if coalesce(jsonb_typeof(p->'steps'), '') <> 'array' or jsonb_array_length(p->'steps') not between 1 and 20 then return false; end if;
  for s in select * from jsonb_array_elements(p->'steps') loop
    if jsonb_typeof(s) <> 'object' then return false; end if;
    if coalesce(s->>'id', '') !~ '^[a-z0-9]{6,12}$' or (s->>'id') = any(ids) then return false; end if;
    ids := ids || (s->>'id');
    typ := s->>'type';
    if typ = 'teach' then
      if not public.adult_cms_bi(s->'text', 600) then return false; end if;
    elsif typ = 'choice' then
      q := q + 1;
      if not public.adult_cms_bi(s->'prompt', 300) then return false; end if;
      if coalesce(jsonb_typeof(s->'options'), '') <> 'array' then return false; end if;
      n := jsonb_array_length(s->'options');
      if n not between 2 and 5 then return false; end if;
      for i in 0 .. n - 1 loop
        if not public.adult_cms_bi(s->'options'->i, 120) then return false; end if;
      end loop;
      select count(distinct o->>'ha') <> n into has_dup from jsonb_array_elements(s->'options') o;
      if has_dup then return false; end if;
      if coalesce(jsonb_typeof(s->'right'), '') <> 'number' or (s->>'right') !~ '^[0-9]$' or (s->>'right')::integer >= n then return false; end if;
      if s ? 'why' and jsonb_typeof(s->'why') <> 'null' and not public.adult_cms_bi(s->'why', 300) then return false; end if;
    elsif typ = 'scam' then
      q := q + 1;
      if not public.adult_cms_bi(s->'text', 400) or not public.adult_cms_bi(s->'why', 300) or coalesce(jsonb_typeof(s->'scam'), '') <> 'boolean' then return false; end if;
    elsif typ = 'tap' then
      q := q + 1;
      if not public.adult_cms_bi(s->'ask', 200) or coalesce(s->>'screen', '') !~ '^[a-z0-9_]{1,30}$' or coalesce(s->>'target', '') !~ '^[a-z0-9_]{1,30}$' then return false; end if;
    else
      return false;
    end if;
  end loop;
  return q <= 12;
end $$;

-- ---------- Row Level Security ----------
alter table public.adult_texts             enable row level security;
alter table public.adult_text_drafts       enable row level security;
alter table public.adult_text_history      enable row level security;
alter table public.adult_audio             enable row level security;
alter table public.adult_cms_lessons       enable row level security;
alter table public.adult_cms_lesson_drafts enable row level security;
alter table public.adult_cms_history       enable row level security;

drop policy if exists "adult_texts: adult users read" on public.adult_texts;
create policy "adult_texts: adult users read" on public.adult_texts for select to authenticated using (public.is_adult_learner() or public.is_adult_staff());
drop policy if exists "adult_audio: adult users read" on public.adult_audio;
create policy "adult_audio: adult users read" on public.adult_audio for select to authenticated using (public.is_adult_learner() or public.is_adult_staff());
-- drafts and history: the adult admin only
drop policy if exists "adult_text_drafts: admin" on public.adult_text_drafts;
create policy "adult_text_drafts: admin" on public.adult_text_drafts for select to authenticated using (public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult_text_history: admin" on public.adult_text_history;
create policy "adult_text_history: admin" on public.adult_text_history for select to authenticated using (public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult_cms_lesson_drafts: admin" on public.adult_cms_lesson_drafts;
create policy "adult_cms_lesson_drafts: admin" on public.adult_cms_lesson_drafts for select to authenticated using (public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult_cms_history: admin" on public.adult_cms_history;
create policy "adult_cms_history: admin" on public.adult_cms_history for select to authenticated using (public.is_adult_staff(array['adult_admin']));
-- lessons: the adult admin sees everything; other staff see published and archived ones; a learner sees PUBLISHED lessons of a course they currently have access to
drop policy if exists "adult_cms_lessons: admin" on public.adult_cms_lessons;
create policy "adult_cms_lessons: admin" on public.adult_cms_lessons for select to authenticated using (public.is_adult_staff(array['adult_admin']));
drop policy if exists "adult_cms_lessons: staff" on public.adult_cms_lessons;
create policy "adult_cms_lessons: staff" on public.adult_cms_lessons for select to authenticated using (status <> 'draft' and public.is_adult_staff());
drop policy if exists "adult_cms_lessons: enrolled learner" on public.adult_cms_lessons;
create policy "adult_cms_lessons: enrolled learner" on public.adult_cms_lessons for select to authenticated using (status = 'published' and public.is_adult_learner() and public.adult_has_course_access(course_id));

revoke all on public.adult_texts, public.adult_text_drafts, public.adult_text_history, public.adult_audio, public.adult_cms_lessons, public.adult_cms_lesson_drafts, public.adult_cms_history from anon, authenticated;
grant select on public.adult_texts, public.adult_text_drafts, public.adult_text_history, public.adult_audio, public.adult_cms_lessons, public.adult_cms_lesson_drafts, public.adult_cms_history to authenticated;

-- ---------- texts: admin functions ----------
create or replace function public.adult_admin_save_text_draft(p_key text, p_lang text, p_value text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_key !~ '^[A-Za-z0-9_.:-]{1,100}$' or p_lang not in ('ha','en') or char_length(coalesce(p_value, '')) not between 1 and 1000 or p_value ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' then raise exception 'bad text' using errcode = 'P0001'; end if;
  insert into public.adult_text_drafts (key, lang, value, updated_by) values (p_key, p_lang, p_value, auth.uid())
  on conflict (key, lang) do update set value = excluded.value, updated_by = auth.uid(), updated_at = now();
end $$;

create or replace function public.adult_admin_discard_text_draft(p_key text, p_lang text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.adult_text_drafts where key = p_key and lang = p_lang;
end $$;

-- Publish the draft of one text (it replaces the built-in text for learners). p_reviewed: "a native speaker has checked this".
create or replace function public.adult_admin_publish_text(p_key text, p_lang text, p_reviewed boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare d public.adult_text_drafts;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into d from public.adult_text_drafts where key = p_key and lang = p_lang;
  if d.key is null then raise exception 'no draft' using errcode = 'P0001'; end if;
  insert into public.adult_texts (key, lang, value, reviewed, updated_by) values (d.key, d.lang, d.value, coalesce(p_reviewed, false), auth.uid())
  on conflict (key, lang) do update set value = excluded.value, reviewed = excluded.reviewed, updated_by = auth.uid(), updated_at = now();
  delete from public.adult_text_drafts where key = p_key and lang = p_lang;
  insert into public.adult_text_history (key, lang, value, action, by_user) values (d.key, d.lang, d.value, 'publish', auth.uid());
end $$;

-- Mark the CURRENT text (built-in or already published) as checked, without changing it. p_value is the text being confirmed.
create or replace function public.adult_admin_mark_reviewed(p_key text, p_lang text, p_value text, p_reviewed boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_key !~ '^[A-Za-z0-9_.:-]{1,100}$' or p_lang not in ('ha','en') or char_length(coalesce(p_value, '')) not between 1 and 1000 or p_value ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' then raise exception 'bad text' using errcode = 'P0001'; end if;
  insert into public.adult_texts (key, lang, value, reviewed, updated_by) values (p_key, p_lang, p_value, coalesce(p_reviewed, false), auth.uid())
  on conflict (key, lang) do update set reviewed = excluded.reviewed, updated_by = auth.uid(), updated_at = now();
  insert into public.adult_text_history (key, lang, value, action, by_user) values (p_key, p_lang, p_value, 'review', auth.uid());
end $$;

-- Bring the built-in text back.
create or replace function public.adult_admin_revert_text(p_key text, p_lang text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.adult_texts where key = p_key and lang = p_lang;
  delete from public.adult_text_drafts where key = p_key and lang = p_lang;
  insert into public.adult_text_history (key, lang, value, action, by_user) values (p_key, p_lang, null, 'revert', auth.uid());
end $$;

-- ---------- audio: admin functions. The browser uploads the file to storage first (allowed to the adult admin only), then calls this. ----------
-- Returns the path of the clip it replaced (the app deletes that file).
create or replace function public.adult_admin_set_audio(p_key text, p_lang text, p_path text, p_mime text, p_bytes integer, p_duration_ms integer, p_text_hash text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_old text;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_key !~ '^[A-Za-z0-9_.:-]{1,100}$' or p_lang not in ('ha','en') or p_text_hash !~ '^[0-9a-f]{8}$' or p_bytes not between 1 and 3145728
     or (p_duration_ms is not null and p_duration_ms not between 1 and 120000) or p_mime not in ('audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-m4a')
     or p_path !~ ('^audio/' || regexp_replace(p_key, '([.])', '\\\1', 'g') || '/' || p_lang || '-[0-9]{10,14}\.(webm|ogg|mp3|m4a|mp4|aac|wav)$') then
    raise exception 'bad audio' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'adult-audio' and o.name = p_path) then raise exception 'bad audio' using errcode = 'P0001'; end if;
  select path into v_old from public.adult_audio where key = p_key and lang = p_lang;
  insert into public.adult_audio (key, lang, path, mime, bytes, duration_ms, text_hash, updated_by) values (p_key, p_lang, p_path, p_mime, p_bytes, p_duration_ms, p_text_hash, auth.uid())
  on conflict (key, lang) do update set path = excluded.path, mime = excluded.mime, bytes = excluded.bytes, duration_ms = excluded.duration_ms, text_hash = excluded.text_hash, updated_by = auth.uid(), updated_at = now();
  return v_old;
end $$;

create or replace function public.adult_admin_confirm_audio(p_key text, p_lang text, p_text_hash text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_text_hash !~ '^[0-9a-f]{8}$' then raise exception 'bad audio' using errcode = 'P0001'; end if;
  update public.adult_audio set text_hash = p_text_hash, updated_by = auth.uid(), updated_at = now() where key = p_key and lang = p_lang;
  if not found then raise exception 'bad audio' using errcode = 'P0001'; end if;
end $$;

-- Returns the file path so the app can delete the file.
create or replace function public.adult_admin_delete_audio(p_key text, p_lang text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_old text;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.adult_audio where key = p_key and lang = p_lang returning path into v_old;
  return v_old;
end $$;

-- ---------- dashboard courses and lessons ----------
create or replace function public.adult_admin_create_course(p_slug text, p_title jsonb, p_description jsonb, p_skill_area text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 3 and 30 or p_slug like 'basic-%' then raise exception 'bad slug' using errcode = 'P0001'; end if;
  if not public.adult_cms_bi(p_title, 80) or (p_description is not null and jsonb_typeof(p_description) <> 'null' and not public.adult_cms_bi(p_description, 300)) or coalesce(p_skill_area, 'other') not in ('read','count','apply','digital','safety','other') then raise exception 'bad course' using errcode = 'P0001'; end if;
  if exists (select 1 from public.adult_courses where slug = p_slug) then raise exception 'slug taken' using errcode = 'P0001'; end if;
  insert into public.adult_courses (slug, kind, title, description, is_free, price_ngn, position, status, origin, skill_area)
  values (p_slug, 'custom', jsonb_build_object('ha', p_title->>'ha', 'en', coalesce(nullif(p_title->>'en', ''), p_title->>'ha')),
          jsonb_build_object('ha', coalesce(p_description->>'ha', ''), 'en', coalesce(nullif(p_description->>'en', ''), p_description->>'ha', '')),
          true, 0, coalesce((select max(position) from public.adult_courses), 0) + 1, 'draft', 'cms', coalesce(p_skill_area, 'other')) returning id into v;
  perform public.adult_log('create_course', null, jsonb_build_object('course', v, 'slug', p_slug));
  return v;
end $$;

create or replace function public.adult_admin_update_course(p_course uuid, p_title jsonb, p_description jsonb, p_skill_area text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not public.adult_cms_bi(p_title, 80) or (p_description is not null and jsonb_typeof(p_description) <> 'null' and not public.adult_cms_bi(p_description, 300)) or coalesce(p_skill_area, 'other') not in ('read','count','apply','digital','safety','other') then raise exception 'bad course' using errcode = 'P0001'; end if;
  update public.adult_courses set title = jsonb_build_object('ha', p_title->>'ha', 'en', coalesce(nullif(p_title->>'en', ''), p_title->>'ha')),
    description = jsonb_build_object('ha', coalesce(p_description->>'ha', ''), 'en', coalesce(nullif(p_description->>'en', ''), p_description->>'ha', '')),
    skill_area = coalesce(p_skill_area, 'other'), updated_at = now()
   where id = p_course and origin = 'cms';
  if not found then raise exception 'course not available' using errcode = 'P0001'; end if;
end $$;

create or replace function public.adult_admin_create_lesson(p_course uuid, p_title jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_key text; v_pos integer;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.adult_courses where id = p_course and origin = 'cms') then raise exception 'course not available' using errcode = 'P0001'; end if;
  if not public.adult_cms_bi(p_title, 100) then raise exception 'bad lesson' using errcode = 'P0001'; end if;
  if (select count(*) from public.adult_cms_lessons where course_id = p_course) >= 100 then raise exception 'bad lesson' using errcode = 'P0001'; end if;
  v_key := 'x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  select coalesce(max(position), 0) + 1 into v_pos from public.adult_cms_lessons where course_id = p_course;
  insert into public.adult_cms_lessons (course_id, key, position, title, created_by) values (p_course, v_key, v_pos, jsonb_build_object('ha', p_title->>'ha', 'en', coalesce(p_title->>'en', '')), auth.uid()) returning id into v_id;
  insert into public.adult_cms_lesson_drafts (lesson_id, content, updated_by)
  values (v_id, jsonb_build_object('title', jsonb_build_object('ha', p_title->>'ha', 'en', coalesce(p_title->>'en', '')), 'steps', '[]'::jsonb), auth.uid());
  return jsonb_build_object('id', v_id, 'key', v_key);
end $$;

-- A draft may be unfinished; only size and shape are checked. Publishing checks everything.
create or replace function public.adult_admin_save_lesson_draft(p_lesson uuid, p_content jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 60000 then raise exception 'bad lesson' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.adult_cms_lessons where id = p_lesson) then raise exception 'lesson not found' using errcode = 'P0001'; end if;
  insert into public.adult_cms_lesson_drafts (lesson_id, content, updated_by) values (p_lesson, p_content, auth.uid())
  on conflict (lesson_id) do update set content = excluded.content, updated_by = auth.uid(), updated_at = now();
end $$;

create or replace function public.adult_admin_publish_lesson(p_lesson uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare d public.adult_cms_lesson_drafts;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into d from public.adult_cms_lesson_drafts where lesson_id = p_lesson for update;
  if d.lesson_id is null then raise exception 'no draft' using errcode = 'P0001'; end if;
  if not public.adult_cms_valid(d.content) then raise exception 'lesson not valid' using errcode = 'P0001'; end if;
  update public.adult_cms_lessons set content = d.content, title = d.content->'title', unit = case when jsonb_typeof(d.content->'unit') = 'object' then d.content->'unit' else null end,
    status = 'published', published_at = coalesce(published_at, now()) where id = p_lesson;
  insert into public.adult_cms_history (lesson_id, content, by_user) values (p_lesson, d.content, auth.uid());
  delete from public.adult_cms_history h where h.lesson_id = p_lesson and h.id not in (select id from public.adult_cms_history where lesson_id = p_lesson order by at desc, id desc limit 10);
  delete from public.adult_cms_lesson_drafts where lesson_id = p_lesson;
  perform public.adult_log('publish_lesson', null, jsonb_build_object('lesson', p_lesson));
end $$;

-- 'draft' = take it off the course for learners (kept), 'archived' = retire it (progress already made is kept). Putting it back to 'published' needs valid content.
create or replace function public.adult_admin_set_lesson_status(p_lesson uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare l public.adult_cms_lessons;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('draft','published','archived') then raise exception 'bad lesson' using errcode = 'P0001'; end if;
  select * into l from public.adult_cms_lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0001'; end if;
  if p_status = 'published' and (l.published_at is null or not public.adult_cms_valid(l.content)) then raise exception 'lesson not valid' using errcode = 'P0001'; end if;
  update public.adult_cms_lessons set status = p_status where id = p_lesson;
end $$;

create or replace function public.adult_admin_move_lesson(p_lesson uuid, p_dir integer) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare l public.adult_cms_lessons; o public.adult_cms_lessons;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_dir not in (-1, 1) then raise exception 'bad lesson' using errcode = 'P0001'; end if;
  select * into l from public.adult_cms_lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0001'; end if;
  select * into o from public.adult_cms_lessons where course_id = l.course_id and ((p_dir = -1 and position < l.position) or (p_dir = 1 and position > l.position))
   order by case when p_dir = -1 then position end desc, case when p_dir = 1 then position end asc limit 1;
  if o.id is null then return; end if;
  update public.adult_cms_lessons set position = case when id = l.id then o.position else l.position end where id in (l.id, o.id);
end $$;

-- Only a lesson that was never published and that nobody has progress on.
create or replace function public.adult_admin_delete_lesson(p_lesson uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare l public.adult_cms_lessons;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into l from public.adult_cms_lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0001'; end if;
  if l.published_at is not null or exists (select 1 from public.adult_lesson_progress lp where lp.lesson_key = l.key) then raise exception 'lesson in use' using errcode = 'P0001'; end if;
  delete from public.adult_cms_lessons where id = p_lesson;
end $$;

-- ---------- certificates for dashboard courses (REPLACES the 024 versions) ----------
create or replace function public.adult_calc_standard(p_learner uuid, p_course uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.adult_courses; v_keys text[]; v_req integer; v_done integer; v_checks integer; v_right integer;
begin
  select * into c from public.adult_courses where id = p_course;
  v_keys := case when c.origin = 'cms'
                 then coalesce((select array_agg(l.key order by l.position) from public.adult_cms_lessons l where l.course_id = c.id and l.status = 'published'), '{}'::text[])
                 else coalesce(c.required_lessons, '{}'::text[]) end;
  v_req := cardinality(v_keys);
  select count(*) filter (where lp.status = 'completed'),
         coalesce(sum(coalesce((lp.last_results->>'pickTotal')::int, 0) + (case when lp.last_results->>'match' in ('yes','no') then 1 else 0 end) + (case when lp.last_results->>'find' in ('yes','no') then 1 else 0 end)), 0),
         coalesce(sum(coalesce((lp.last_results->>'pickRight')::int, 0) + (case when lp.last_results->>'match' = 'yes' then 1 else 0 end) + (case when lp.last_results->>'find' = 'yes' then 1 else 0 end)), 0)
    into v_done, v_checks, v_right
    from public.adult_lesson_progress lp where lp.learner_id = p_learner and lp.course_id = p_course and lp.lesson_key = any(v_keys);
  return jsonb_build_object('required', v_req, 'completed', v_done, 'checks', v_checks, 'right', least(v_right, v_checks),
    'eligible', v_req > 0 and v_done >= v_req and (v_checks = 0 or least(v_right, v_checks)::numeric / v_checks >= 0.6));
end $$;

create or replace function public.adult_claim_certificate(p_course uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; s jsonb; cert public.adult_certificates; p public.adult_profiles;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_courses where id = p_course;
  if c.id is null or (c.origin = 'code' and c.required_lessons is null) then raise exception 'course not available' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.adult_enrollments e where e.learner_id = auth.uid() and e.course_id = c.id) then raise exception 'not enrolled' using errcode = '42501'; end if;
  select * into cert from public.adult_certificates where learner_id = auth.uid() and course_id = c.id;
  if cert.id is not null then
    if cert.status = 'revoked' then raise exception 'certificate withdrawn' using errcode = 'P0001'; end if;
    return to_jsonb(cert);
  end if;
  s := public.adult_calc_standard(auth.uid(), c.id);
  if not (s->>'eligible')::boolean then raise exception 'not yet complete' using errcode = 'P0001'; end if;
  select * into p from public.adult_profiles where id = auth.uid();
  insert into public.adult_certificates (number, learner_id, course_id, learner_name, course_title, standard)
  values ('ASAR-AD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.adult_certificate_seq')::text, 6, '0'), auth.uid(), c.id, p.full_name, c.title, s)
  returning * into cert;
  perform public.adult_log('claim_certificate', auth.uid(), jsonb_build_object('course', c.id, 'number', cert.number));
  return to_jsonb(cert);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'adult_has_course_access(uuid)','adult_admin_save_text_draft(text,text,text)','adult_admin_discard_text_draft(text,text)','adult_admin_publish_text(text,text,boolean)',
    'adult_admin_mark_reviewed(text,text,text,boolean)','adult_admin_revert_text(text,text)','adult_admin_set_audio(text,text,text,text,integer,integer,text)',
    'adult_admin_confirm_audio(text,text,text)','adult_admin_delete_audio(text,text)','adult_admin_create_course(text,jsonb,jsonb,text)','adult_admin_update_course(uuid,jsonb,jsonb,text)',
    'adult_admin_create_lesson(uuid,jsonb)','adult_admin_save_lesson_draft(uuid,jsonb)','adult_admin_publish_lesson(uuid)','adult_admin_set_lesson_status(uuid,text)',
    'adult_admin_move_lesson(uuid,integer)','adult_admin_delete_lesson(uuid)','adult_claim_certificate(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- internal helpers and the certificate calculation: nobody calls them directly
  revoke all on function public.adult_cms_bi(jsonb,integer) from public, anon, authenticated;
  revoke all on function public.adult_cms_valid(jsonb) from public, anon, authenticated;
  revoke all on function public.adult_calc_standard(uuid,uuid) from public, anon, authenticated;
end $$;
