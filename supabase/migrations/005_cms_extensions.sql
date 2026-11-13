-- ASARTUN TECH BUILDER — Migration 005: Content Management System extensions
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-004.  Safe to run twice.
-- Adds ONLY what the CMS needs: review status, lesson metadata, richer media, edit history,
-- delete/publish guards, mission ordering/duplication, and a private media bucket for learners.

-- ---------- 1. Mission status: add 'under_review' ----------
do $$ declare c text; begin
  for c in select conname from pg_constraint
           where conrelid = 'public.missions'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%draft%'
  loop execute format('alter table public.missions drop constraint %I', c); end loop;
end $$;
alter table public.missions add constraint missions_status_check
  check (status in ('draft','under_review','published','coming_soon','archived'));

-- ---------- 2. Lesson metadata ----------
alter table public.missions add column if not exists estimated_minutes smallint check (estimated_minutes between 1 and 600);
alter table public.missions add column if not exists objectives jsonb not null default '[]'::jsonb;   -- [{ha,en}, ...]
-- image / audio_ha / audio_en for a quiz question (flat keys on purpose: {ha,en} objects must be fully translated)
alter table public.game_questions add column if not exists media jsonb not null default '{}'::jsonb;

-- ---------- 3. Media: more kinds, language, original name ----------
do $$ declare c text; begin
  for c in select conname from pg_constraint
           where conrelid = 'public.media_assets'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%image%'
  loop execute format('alter table public.media_assets drop constraint %I', c); end loop;
end $$;
alter table public.media_assets add constraint media_assets_kind_check check (kind in ('image','audio','animation','video'));
alter table public.media_assets add column if not exists language text check (language in ('ha','en'));
alter table public.media_assets add column if not exists original_name text;

-- ---------- 4. Who changed what (stamps + last edit of lessons) ----------
create or replace function public.stamp_actor() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists missions_stamp_actor on public.missions;
create trigger missions_stamp_actor before insert or update on public.missions
  for each row execute function public.stamp_actor();

create table if not exists public.mission_last_edit (
  mission_id uuid primary key references public.missions(id) on delete cascade,
  edited_by  uuid references auth.users(id) on delete set null,
  edited_at  timestamptz not null default now()
);
alter table public.mission_last_edit enable row level security;
drop policy if exists "last_edit: admins read" on public.mission_last_edit;
create policy "last_edit: admins read" on public.mission_last_edit for select to authenticated
  using (public.has_admin_role(array['content_manager','media_manager','learning_analyst']));
revoke all on public.mission_last_edit from anon;
revoke insert, update, delete on public.mission_last_edit from authenticated;   -- written only by the trigger below

create or replace function public.touch_mission_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mid uuid := coalesce(new.mission_id, old.mission_id);
begin
  if auth.uid() is not null and exists (select 1 from public.missions where id = mid) then
    insert into public.mission_last_edit (mission_id, edited_by, edited_at) values (mid, auth.uid(), now())
    on conflict (mission_id) do update set edited_by = excluded.edited_by, edited_at = excluded.edited_at;
  end if;
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['mission_steps','game_questions'] loop
    execute format('drop trigger if exists touch_edit on public.%I', t);
    execute format('create trigger touch_edit after insert or update or delete on public.%I
                    for each row execute function public.touch_mission_edit()', t);
  end loop;
end $$;

-- Audit log now also covers lesson steps and questions (still written only by triggers).
create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rec jsonb;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.admin_activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(rec ->> 'id', rec ->> 'key'),
    jsonb_strip_nulls(jsonb_build_object('slug', rec ->> 'slug', 'status', rec ->> 'status', 'role', rec ->> 'role',
      'key', rec ->> 'key', 'target_user', rec ->> 'user_id', 'mission_id', rec ->> 'mission_id', 'stage', rec ->> 'stage')));
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['mission_steps','game_questions'] loop
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I
                    for each row execute function public.log_admin_change()', t);
  end loop;
end $$;

-- ---------- 5. Publishing also checks lesson objectives (Hausa + English) ----------
create or replace function public.mission_gaps(m public.missions)
returns text[] language plpgsql stable set search_path = '' as $$
declare gaps text[] := '{}'; r record;
begin
  gaps := gaps || public.jsonb_lang_gaps(m.title, 'title');
  gaps := gaps || public.jsonb_lang_gaps(m.description, 'description');
  gaps := gaps || public.jsonb_lang_gaps(m.objectives, 'objectives');
  if m.stages ? 'teach' and not exists (select 1 from public.mission_steps s where s.mission_id = m.id and s.stage = 'teach') then
    gaps := gaps || 'at least one teaching page is required';
  end if;
  if m.stages ? 'quiz' and not exists (select 1 from public.game_questions q where q.mission_id = m.id) then
    gaps := gaps || 'at least one quiz question is required';
  end if;
  for r in select stage, position, step_key, content from public.mission_steps where mission_id = m.id loop
    gaps := gaps || public.jsonb_lang_gaps(r.content, 'step:' || r.stage || ':' || coalesce(r.step_key, r.position::text));
  end loop;
  for r in select position, question, options, explanation from public.game_questions where mission_id = m.id loop
    gaps := gaps || public.jsonb_lang_gaps(
      jsonb_build_object('question', r.question, 'options', r.options, 'explanation', r.explanation), 'question:' || r.position);
  end loop;
  return gaps;
end $$;

-- ---------- 6. Media usage (admin view) and published-media check (learner access + delete guard) ----------
create or replace function public.media_is_published(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_path is not null and (
    exists (select 1 from public.missions m where m.status = 'published' and m.cover_image_path = p_path)
    or exists (select 1 from public.mission_steps s join public.missions m on m.id = s.mission_id
               where m.status = 'published' and position(p_path in s.content::text) > 0)
    or exists (select 1 from public.game_questions q join public.missions m on m.id = q.mission_id
               where m.status = 'published' and position(p_path in q.media::text) > 0));
$$;

create or replace function public.media_usage(p_path text)
returns table (mission_id uuid, slug text, status text, location text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['media_manager','content_manager','learning_analyst']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select m.id, m.slug, m.status, 'cover image'::text from public.missions m where m.cover_image_path = p_path
    union all
    select m.id, m.slug, m.status, ('lesson: ' || s.stage || coalesce(' / ' || s.step_key, ' #' || s.position))::text
      from public.mission_steps s join public.missions m on m.id = s.mission_id where position(p_path in s.content::text) > 0
    union all
    select m.id, m.slug, m.status, ('quiz question #' || (q.position + 1))::text
      from public.game_questions q join public.missions m on m.id = q.mission_id where position(p_path in q.media::text) > 0;
end $$;

-- A file used by a PUBLISHED mission cannot be deleted (database row or storage object).
create or replace function public.protect_published_media() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.media_is_published(old.path) then
    raise exception 'This file is used by a published mission. Unpublish the mission or replace the file instead.' using errcode = '23503';
  end if;
  return old;
end $$;
drop trigger if exists media_delete_guard on public.media_assets;
create trigger media_delete_guard before delete on public.media_assets
  for each row execute function public.protect_published_media();

-- A published mission cannot be deleted directly.
create or replace function public.protect_published_mission() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'published' then
    raise exception 'Unpublish or archive this mission before deleting it.' using errcode = '23503';
  end if;
  return old;
end $$;
drop trigger if exists missions_delete_guard on public.missions;
create trigger missions_delete_guard before delete on public.missions
  for each row execute function public.protect_published_mission();

-- ---------- 7. Storage: PRIVATE bucket. Learners may read only media of PUBLISHED missions ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 31457280,
        array['image/png','image/jpeg','image/webp','image/gif',
              'audio/mpeg','audio/mp4','audio/x-m4a','audio/ogg','audio/wav','audio/webm',
              'video/mp4','video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media bucket: learners read published" on storage.objects;
create policy "media bucket: learners read published" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media' and public.media_is_published(name));

drop policy if exists "media bucket: admins delete" on storage.objects;
create policy "media bucket: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager'])
         and not public.media_is_published(name));

-- ---------- 8. Mission ordering, duplication, admin names ----------
create or replace function public.reorder_missions(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare i int;
begin
  if not public.has_admin_role(array['content_manager']) then raise exception 'not allowed' using errcode = '42501'; end if;
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop      -- two phases: mission_no is unique
    update public.missions set mission_no = -i where id = p_ids[i];
  end loop;
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.missions set mission_no = i where id = p_ids[i];
  end loop;
end $$;

create or replace function public.duplicate_mission(p_id uuid, p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_new uuid; m public.missions;
begin
  if not public.has_admin_role(array['content_manager']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_slug !~ '^[a-z0-9-]+$' then raise exception 'slug may contain only a-z, 0-9 and -' using errcode = '22023'; end if;
  select * into m from public.missions where id = p_id;
  if not found then raise exception 'mission not found'; end if;
  insert into public.missions (slug, mission_no, emoji, title, description, category_id, age_min, age_max, difficulty,
      cover_image_path, status, stages, reward_rules, engine_options, estimated_minutes, objectives)
  values (p_slug, (select coalesce(max(mission_no), 0) + 1 from public.missions), m.emoji,
      jsonb_build_object('ha', coalesce(m.title ->> 'ha', '') || ' (kwafi)', 'en', coalesce(m.title ->> 'en', '') || ' (copy)'),
      m.description, m.category_id, m.age_min, m.age_max, m.difficulty, m.cover_image_path, 'draft', m.stages,
      m.reward_rules, m.engine_options, m.estimated_minutes, m.objectives)
  returning id into v_new;
  insert into public.mission_steps (mission_id, stage, step_type, step_key, position, content)
    select v_new, stage, step_type, step_key, position, content from public.mission_steps where mission_id = p_id;
  insert into public.game_questions (mission_id, position, question, options, correct_index, explanation, points, media)
    select v_new, position, question, options, correct_index, explanation, points, media from public.game_questions where mission_id = p_id;
  return v_new;
end $$;

create or replace function public.admin_names() returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['content_manager','media_manager','learning_analyst']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select distinct r.user_id, u.email::text from public.admin_roles r join auth.users u on u.id = r.user_id;
end $$;

revoke all on function public.media_usage(text), public.reorder_missions(uuid[]), public.duplicate_mission(uuid, text),
                       public.admin_names(), public.touch_mission_edit() from public, anon;
grant execute on function public.media_usage(text), public.reorder_missions(uuid[]), public.duplicate_mission(uuid, text),
                          public.admin_names() to authenticated;
grant execute on function public.media_is_published(text) to anon, authenticated;
