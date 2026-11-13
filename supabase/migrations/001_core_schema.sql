-- ASARTUN TECH BUILDER — Migration 001: core schema
-- Owner: ASARTUN STORE LIMITED
-- Run order: 001 → 002 → 003 (Supabase SQL Editor, or `supabase db push`).
-- No table here existed before this migration (the learner app used localStorage only).

-- ---------- shared helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- categories ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name       jsonb not null default '{"ha":"","en":""}'::jsonb,   -- {ha, en}
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- missions ----------
-- title/description are {ha, en}. `reward_rules`, `stages` and `engine_options`
-- keep the exact shape the existing MissionEngine already expects.
create table public.missions (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),   -- 'cassava', 'potato', ...
  mission_no       integer unique,
  emoji            text not null default '🛠️',
  title            jsonb not null default '{"ha":"","en":""}'::jsonb,
  description      jsonb not null default '{}'::jsonb,
  category_id      uuid references public.categories(id) on delete set null,
  age_min          smallint not null default 6  check (age_min between 3 and 18),
  age_max          smallint not null default 12 check (age_max between 3 and 18),
  difficulty       text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  cover_image_path text,                                               -- path inside the 'media' bucket
  status           text not null default 'draft' check (status in ('draft','published','coming_soon','archived')),
  stages           jsonb not null default '["teach","show","practice","challenge","quiz","reward"]'::jsonb,
  reward_rules     jsonb not null default '{}'::jsonb,                 -- {teach:[10,"Badge"], show:5, quiz:5, finish:[10,"Badge"]}
  engine_options   jsonb not null default '{}'::jsonb,                 -- {mixed:true, header_title:{ha,en}}
  created_by       uuid references auth.users(id) on delete set null,
  updated_by       uuid references auth.users(id) on delete set null,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (age_max >= age_min)
);
create index missions_status_idx   on public.missions (status);
create index missions_category_idx on public.missions (category_id);

-- ---------- mission_steps ----------
-- One row per lesson unit. `content` holds the same JSON the engine already uses.
--   stage 'teach'     → a teaching page          (content = page object)
--   stage 'demo'      → a reusable process step  (step_key = 'peel', content = {emoji,name,text})
--   stage 'procedure' → ordered list of demo keys (step_key = 'garri', content = {steps:[...],result,summary,...})
--   stage 'challenge' → sort / safety / business (step_key = 'sort', content = {type,key,items})
create table public.mission_steps (
  id         uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  stage      text not null check (stage in ('teach','demo','procedure','challenge')),
  step_type  text not null check (step_type in ('story','explanation','demonstration','drag_drop','simulation','quiz','challenge')),
  step_key   text,
  position   integer not null default 0,
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mission_steps_mission_idx on public.mission_steps (mission_id, stage, position);
create unique index mission_steps_key_uq on public.mission_steps (mission_id, stage, step_key) where step_key is not null;

-- ---------- game_questions ----------
create table public.game_questions (
  id            uuid primary key default gen_random_uuid(),
  mission_id    uuid not null references public.missions(id) on delete cascade,
  position      integer not null default 0,
  question      jsonb not null default '{"ha":"","en":""}'::jsonb,
  options       jsonb not null default '[]'::jsonb,                    -- [{ha,en}, ...]
  correct_index integer not null check (correct_index >= 0),
  explanation   jsonb not null default '{"ha":"","en":""}'::jsonb,
  points        integer not null default 5 check (points >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array'),
  check (correct_index < jsonb_array_length(options))
);
create index game_questions_mission_idx on public.game_questions (mission_id, position);

-- ---------- rewards (badges) ----------
create table public.rewards (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,                    -- matches the badge ids already in learners' saved state
  emoji      text not null default '🏅',
  name       jsonb not null default '{"ha":"","en":""}'::jsonb,
  how        jsonb not null default '{"ha":"","en":""}'::jsonb,
  points     integer not null default 0 check (points >= 0),
  condition  jsonb not null default '{}'::jsonb,      -- descriptive; awarding is driven by missions.reward_rules
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- profiles (one per learner; id = auth user id, incl. anonymous sign-in) ----------
-- No email, phone or password is stored here. `points` is written ONLY by award_progress().
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nickname       text not null check (char_length(btrim(nickname)) between 1 and 16),
  age_band       text check (age_band in ('5-7','8-10','11-13','14-17')),
  points         integer not null default 0 check (points >= 0),
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_last_active_idx on public.profiles (last_active_at);

-- ---------- user_progress (append-only ledger; one row per reward key = no point farming) ----------
create table public.user_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  mission_id     uuid references public.missions(id) on delete set null,
  event_key      text not null,                       -- same keys the app uses today: 'cassava:teach', 'cassava:quiz-3'
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (user_id, event_key)
);
create index user_progress_mission_idx on public.user_progress (mission_id);
create index user_progress_created_idx on public.user_progress (created_at);

-- ---------- user_rewards ----------
create table public.user_rewards (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, reward_id)
);
create index user_rewards_reward_idx on public.user_rewards (reward_id);

-- ---------- parent_links ----------
-- Guardian approval/linking. Stores NO guardian contact details; the guardian is an auth user.
create table public.parent_links (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.profiles(id) on delete cascade,
  guardian_id    uuid references auth.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','approved','revoked')),
  link_code_hash text,                                -- hash of a one-time code shown on the child's device
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (child_id, guardian_id)
);
create index parent_links_guardian_idx on public.parent_links (guardian_id);

-- ---------- admin_roles ----------
create table public.admin_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('super_admin','content_manager','learning_analyst','media_manager')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index admin_roles_user_idx on public.admin_roles (user_id);

-- ---------- admin_activity_logs (written only by database triggers/functions) ----------
create table public.admin_activity_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_logs_created_idx on public.admin_activity_logs (created_at desc);
create index admin_logs_actor_idx   on public.admin_activity_logs (actor_id);

-- ---------- app_settings (branding & languages) ----------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------- media_assets ----------
create table public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  mission_id  uuid references public.missions(id) on delete set null,
  bucket      text not null default 'media',
  path        text not null unique,
  kind        text not null check (kind in ('image','audio')),
  mime_type   text,
  size_bytes  bigint check (size_bytes >= 0),
  alt         jsonb not null default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index media_assets_mission_idx on public.media_assets (mission_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['categories','missions','mission_steps','game_questions','rewards',
                           'profiles','parent_links','app_settings','media_assets']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
