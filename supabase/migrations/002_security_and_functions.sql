-- ASARTUN TECH BUILDER — Migration 002: roles, RLS, publish rules, rewards, storage
-- Every authorization decision lives here, in the database. Hiding buttons in the UI is NOT security.

-- =====================================================================
-- 1. Role helpers (SECURITY DEFINER so policies can read admin_roles safely)
-- =====================================================================
create or replace function public.has_admin_role(allowed text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    -- anonymous (learner) sessions can never be admins, even if a row were inserted by mistake
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.admin_roles r
      where r.user_id = auth.uid()
        and (r.role = any (allowed) or r.role = 'super_admin')   -- super_admin passes every check
    );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.has_admin_role(array['super_admin']); $$;

-- =====================================================================
-- 2. Translation completeness (Hausa + English both required to publish)
-- =====================================================================
-- Walks any JSON; every object that has an "ha" or "en" key must have BOTH, non-empty.
create or replace function public.jsonb_lang_gaps(j jsonb, path text default '')
returns text[]
language plpgsql immutable set search_path = ''
as $$
declare
  gaps text[] := '{}';
  k text; v jsonb; elem jsonb; i integer := 0;
begin
  if j is null then return gaps; end if;
  if jsonb_typeof(j) = 'object' then
    if j ? 'ha' or j ? 'en' then
      if coalesce(btrim(j ->> 'ha'), '') = '' then gaps := gaps || (path || '.ha'); end if;
      if coalesce(btrim(j ->> 'en'), '') = '' then gaps := gaps || (path || '.en'); end if;
      return gaps;
    end if;
    for k, v in select * from jsonb_each(j) loop
      gaps := gaps || public.jsonb_lang_gaps(v, path || '.' || k);
    end loop;
  elsif jsonb_typeof(j) = 'array' then
    for elem in select * from jsonb_array_elements(j) loop
      gaps := gaps || public.jsonb_lang_gaps(elem, path || '[' || i || ']');
      i := i + 1;
    end loop;
  end if;
  return gaps;
end $$;

-- Core check on a mission ROW (so the trigger can test the values being saved).
create or replace function public.mission_gaps(m public.missions)
returns text[]
language plpgsql stable set search_path = ''
as $$
declare
  gaps text[] := '{}';
  r record;
begin
  gaps := gaps || public.jsonb_lang_gaps(m.title, 'title');
  gaps := gaps || public.jsonb_lang_gaps(m.description, 'description');
  if m.stages ? 'teach' and not exists (
       select 1 from public.mission_steps s where s.mission_id = m.id and s.stage = 'teach') then
    gaps := gaps || 'at least one teaching page is required';
  end if;
  if m.stages ? 'quiz' and not exists (
       select 1 from public.game_questions q where q.mission_id = m.id) then
    gaps := gaps || 'at least one quiz question is required';
  end if;
  for r in select stage, position, step_key, content from public.mission_steps where mission_id = m.id loop
    gaps := gaps || public.jsonb_lang_gaps(
      r.content, 'step:' || r.stage || ':' || coalesce(r.step_key, r.position::text));
  end loop;
  for r in select position, question, options, explanation from public.game_questions where mission_id = m.id loop
    gaps := gaps || public.jsonb_lang_gaps(
      jsonb_build_object('question', r.question, 'options', r.options, 'explanation', r.explanation),
      'question:' || r.position);
  end loop;
  return gaps;
end $$;

-- Convenience for the admin UI ("Missing translations" panel).
create or replace function public.mission_translation_gaps(p_mission_id uuid)
returns text[]
language sql stable set search_path = ''
as $$
  select public.mission_gaps(m) from public.missions m where m.id = p_mission_id;
$$;

-- Block publishing when anything essential is missing in either language.
create or replace function public.enforce_publish_rules()
returns trigger language plpgsql set search_path = ''
as $$
declare gaps text[];
begin
  if new.status = 'published' then
    gaps := public.mission_gaps(new);
    if coalesce(array_length(gaps, 1), 0) > 0 then
      raise exception 'Cannot publish "%": %', new.slug, array_to_string(gaps, '; ')
        using errcode = '23514';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    end if;
  end if;
  return new;
end $$;

create trigger missions_publish_rules
  before insert or update on public.missions
  for each row execute function public.enforce_publish_rules();

-- Keep already-published missions complete when their steps/questions are edited.
create or replace function public.enforce_child_translations()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare st text; gaps text[];
begin
  select status into st from public.missions where id = new.mission_id;
  if st = 'published' then
    if tg_table_name = 'mission_steps' then
      gaps := public.jsonb_lang_gaps(new.content, 'content');
    else
      gaps := public.jsonb_lang_gaps(
        jsonb_build_object('question', new.question, 'options', new.options, 'explanation', new.explanation),
        'question');
    end if;
    if coalesce(array_length(gaps, 1), 0) > 0 then
      raise exception 'Published mission content must have Hausa and English: %', array_to_string(gaps, '; ')
        using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger steps_translation_rules
  before insert or update on public.mission_steps
  for each row execute function public.enforce_child_translations();
create trigger questions_translation_rules
  before insert or update on public.game_questions
  for each row execute function public.enforce_child_translations();

-- =====================================================================
-- 3. Audit log (trusted: written by triggers, never by the browser)
-- =====================================================================
create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare rec jsonb;
begin
  if auth.uid() is null then          -- SQL editor / migrations / seeds: not an app user action
    return coalesce(new, old);
  end if;
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.admin_activity_logs (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(), lower(tg_op), tg_table_name, coalesce(rec ->> 'id', rec ->> 'key'),
    jsonb_strip_nulls(jsonb_build_object(
      'slug', rec ->> 'slug', 'status', rec ->> 'status', 'role', rec ->> 'role',
      'key', rec ->> 'key', 'target_user', rec ->> 'user_id'))
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['missions','categories','rewards','admin_roles','app_settings','media_assets','parent_links']
  loop
    execute format('create trigger audit_log after insert or update or delete on public.%I
                    for each row execute function public.log_admin_change()', t);
  end loop;
end $$;

-- Never let the platform lock itself out: the last Super Admin cannot be removed via the app.
create or replace function public.protect_last_super_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null
     and old.role = 'super_admin'
     and (tg_op = 'DELETE' or new.role <> 'super_admin')
     and (select count(*) from public.admin_roles where role = 'super_admin') <= 1 then
    raise exception 'The last Super Admin cannot be removed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger admin_roles_protect_last
  before update or delete on public.admin_roles
  for each row execute function public.protect_last_super_admin();

-- =====================================================================
-- 4. Learner functions (the ONLY way points/rewards can change)
-- =====================================================================
create or replace function public.ensure_my_profile(p_nickname text, p_age_band text default null)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_row public.profiles;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.profiles (id, nickname, age_band, last_active_at)
  values (v_uid, btrim(p_nickname), p_age_band, now())
  on conflict (id) do update
    set nickname = excluded.nickname,
        age_band = coalesce(excluded.age_band, public.profiles.age_band),
        last_active_at = now()
  returning * into v_row;
  return v_row;
end $$;

-- Points come from missions.reward_rules (server-side), never from the browser.
-- Each event key pays once per learner (unique constraint), so replaying cannot farm points.
-- Event keys: 'cassava:teach', 'cassava:show-garri', 'cassava:practice-garri',
--             'cassava:challenge-sort', 'cassava:quiz-3', 'cassava:finish'.
create or replace function public.award_progress(p_event_key text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text; v_event text; v_rule_key text;
  v_mission public.missions; v_rule jsonb;
  v_points integer; v_badge text;
  v_inserted uuid; v_reward_id uuid; v_new_badge boolean := false;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_event_key is null or length(p_event_key) > 80
     or p_event_key !~ '^[a-z0-9-]+:[A-Za-z0-9_-]+$' then
    raise exception 'invalid event key' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'create a profile first' using errcode = 'P0001';
  end if;

  v_slug  := split_part(p_event_key, ':', 1);
  v_event := split_part(p_event_key, ':', 2);
  select * into v_mission from public.missions where slug = v_slug and status = 'published';
  if not found then raise exception 'unknown or unpublished mission' using errcode = '22023'; end if;

  v_rule_key := case when v_event like 'challenge-%' then substr(v_event, 11)
                     else split_part(v_event, '-', 1) end;
  v_rule := v_mission.reward_rules -> v_rule_key;
  if v_rule is null then raise exception 'no reward rule for this event' using errcode = '22023'; end if;

  if jsonb_typeof(v_rule) = 'array' then
    v_points := (v_rule ->> 0)::integer;  v_badge := v_rule ->> 1;
  else
    v_points := (v_rule #>> '{}')::integer;
  end if;

  insert into public.user_progress (user_id, mission_id, event_key, points_awarded)
  values (v_uid, v_mission.id, p_event_key, v_points)
  on conflict (user_id, event_key) do nothing
  returning id into v_inserted;

  update public.profiles set last_active_at = now() where id = v_uid;
  if v_inserted is null then
    return jsonb_build_object('awarded', false, 'points', 0, 'badge', null);
  end if;

  update public.profiles set points = points + v_points where id = v_uid;
  if v_badge is not null then
    select id into v_reward_id from public.rewards where slug = v_badge and active;
    if v_reward_id is not null then
      insert into public.user_rewards (user_id, reward_id) values (v_uid, v_reward_id)
      on conflict (user_id, reward_id) do nothing;
      v_new_badge := found;
    end if;
  end if;
  return jsonb_build_object('awarded', true, 'points', v_points,
                            'badge', case when v_new_badge then v_badge end);
end $$;

-- =====================================================================
-- 5. Admin reporting functions (aggregated; role-checked inside)
-- =====================================================================
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.has_admin_role(array['learning_analyst','content_manager']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_learners',      (select count(*) from public.profiles),
    'active_learners',     (select count(*) from public.profiles where last_active_at > now() - interval '7 days'),
    'published_missions',  (select count(*) from public.missions where status = 'published'),
    'completed_missions',  (select count(*) from public.user_progress where event_key like '%:finish'),
    'popular_missions',    (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
        select m.slug, m.title,
               count(distinct up.user_id) as learners,
               count(distinct up.user_id) filter (where up.event_key = m.slug || ':finish') as completed
        from public.missions m
        left join public.user_progress up on up.mission_id = m.id
        where m.status = 'published'
        group by m.id
        order by learners desc, m.mission_no
        limit 5) t),
    'daily_activity',      (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb) from (
        select g::date as day,
               (select count(*) from public.user_progress up where up.created_at::date = g::date) as events
        from generate_series(current_date - 6, current_date, interval '1 day') g) d)
  );
end $$;

-- Privacy-limited learner list (Super Admin only; every call is logged).
create or replace function public.admin_list_learners()
returns table (id uuid, nickname text, age_band text, points integer,
               missions_started bigint, missions_completed bigint, badges bigint,
               last_active_at timestamptz)
language plpgsql volatile security definer set search_path = ''   -- volatile: it writes an audit row
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.admin_activity_logs (actor_id, action, entity, details)
  values (auth.uid(), 'view', 'learners', '{}'::jsonb);
  return query
    select p.id, p.nickname, p.age_band, p.points,
           (select count(distinct up.mission_id) from public.user_progress up where up.user_id = p.id),
           (select count(*) from public.user_progress up where up.user_id = p.id and up.event_key like '%:finish'),
           (select count(*) from public.user_rewards ur where ur.user_id = p.id),
           p.last_active_at
    from public.profiles p
    order by p.last_active_at desc nulls last;
end $$;
-- NOTE: no email, phone or password column exists on profiles, so none can be returned.

-- =====================================================================
-- 6. Function privileges
-- =====================================================================
revoke all on function
  public.has_admin_role(text[]), public.is_super_admin(), public.jsonb_lang_gaps(jsonb, text),
  public.mission_gaps(public.missions), public.mission_translation_gaps(uuid),
  public.ensure_my_profile(text, text), public.award_progress(text),
  public.admin_dashboard_stats(), public.admin_list_learners()
from public, anon;
grant execute on function
  public.has_admin_role(text[]), public.is_super_admin(), public.jsonb_lang_gaps(jsonb, text),
  public.mission_gaps(public.missions), public.mission_translation_gaps(uuid),
  public.ensure_my_profile(text, text), public.award_progress(text),
  public.admin_dashboard_stats(), public.admin_list_learners()
to authenticated;

-- =====================================================================
-- 7. Row Level Security
-- =====================================================================
alter table public.categories          enable row level security;
alter table public.missions            enable row level security;
alter table public.mission_steps       enable row level security;
alter table public.game_questions      enable row level security;
alter table public.rewards             enable row level security;
alter table public.profiles            enable row level security;
alter table public.user_progress       enable row level security;
alter table public.user_rewards        enable row level security;
alter table public.parent_links        enable row level security;
alter table public.admin_roles         enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.app_settings        enable row level security;
alter table public.media_assets        enable row level security;

-- Defense in depth: strip table privileges that RLS policies should never need.
revoke all on public.profiles, public.user_progress, public.user_rewards, public.parent_links,
              public.admin_roles, public.admin_activity_logs, public.media_assets from anon;
revoke insert, update, delete on public.profiles, public.user_progress, public.user_rewards,
              public.admin_activity_logs from authenticated;

-- ---- categories ----
create policy "categories: public read"   on public.categories for select to anon, authenticated using (true);
create policy "categories: content write" on public.categories for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));

-- ---- missions ----
create policy "missions: public read live" on public.missions for select to anon, authenticated
  using (status in ('published','coming_soon'));
create policy "missions: admins read all"  on public.missions for select to authenticated
  using (public.has_admin_role(array['content_manager','media_manager','learning_analyst']));
create policy "missions: content write"    on public.missions for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));

-- ---- mission_steps / game_questions ----
create policy "steps: public read published" on public.mission_steps for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = mission_steps.mission_id and m.status = 'published'));
create policy "steps: content manage" on public.mission_steps for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));

create policy "questions: public read published" on public.game_questions for select to anon, authenticated
  using (exists (select 1 from public.missions m where m.id = game_questions.mission_id and m.status = 'published'));
create policy "questions: content manage" on public.game_questions for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));

-- ---- rewards (badge catalogue) ----
create policy "rewards: public read active" on public.rewards for select to anon, authenticated using (active);
create policy "rewards: admins read all"    on public.rewards for select to authenticated
  using (public.has_admin_role(array['content_manager','media_manager','learning_analyst']));
create policy "rewards: content write"      on public.rewards for all to authenticated
  using (public.has_admin_role(array['content_manager'])) with check (public.has_admin_role(array['content_manager']));

-- ---- learner data: own rows only, read-only (writes happen in award_progress / ensure_my_profile) ----
create policy "profiles: read own"       on public.profiles      for select to authenticated using (id = auth.uid());
create policy "progress: read own"       on public.user_progress for select to authenticated using (user_id = auth.uid());
create policy "user_rewards: read own"   on public.user_rewards  for select to authenticated using (user_id = auth.uid());

-- ---- parent_links ----
create policy "parent_links: child or guardian reads" on public.parent_links for select to authenticated
  using (child_id = auth.uid() or guardian_id = auth.uid());
create policy "parent_links: super admin manages" on public.parent_links for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
-- Child↔guardian request/approve flow will be added as SECURITY DEFINER functions in the learners phase.

-- ---- admin_roles: only Super Admin manages; everyone can read their OWN roles ----
create policy "admin_roles: read own or super"  on public.admin_roles for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
create policy "admin_roles: super admin manages" on public.admin_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---- admin_activity_logs: Super Admin read-only; no insert policy (triggers write) ----
create policy "logs: super admin read" on public.admin_activity_logs for select to authenticated
  using (public.is_super_admin());

-- ---- app_settings (branding is public by nature; only Super Admin edits) ----
create policy "settings: public read" on public.app_settings for select to anon, authenticated using (true);
create policy "settings: super admin write" on public.app_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---- media_assets ----
create policy "media: admins read" on public.media_assets for select to authenticated
  using (public.has_admin_role(array['media_manager','content_manager']));
create policy "media: manage" on public.media_assets for all to authenticated
  using (public.has_admin_role(array['media_manager','content_manager']))
  with check (public.has_admin_role(array['media_manager','content_manager']));

-- =====================================================================
-- 8. Storage: public-readable 'media' bucket, admin-only writes
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/gif',
              'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- (SVG is deliberately not allowed: SVG files can carry scripts.)

create policy "media bucket: admins list" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager']));
create policy "media bucket: admins upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager']));
create policy "media bucket: admins replace" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager']))
  with check (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager']));
create policy "media bucket: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_admin_role(array['media_manager','content_manager']));
