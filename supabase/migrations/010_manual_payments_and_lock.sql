-- ASARTUN TECH BUILDER — Migration 010: lock the app / premium missions, manual payments, activation codes
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-006 (and 008).  Safe to run twice.
-- Manual payment flow: the family pays by bank transfer / cash / mobile money OUTSIDE the app, then either
--   (a) taps "I have paid" with the payment reference and an admin approves it, or
--   (b) types an activation code that an admin gave them.
-- The app never asks for card numbers, bank PINs or passwords.

-- ============================== tables ==============================
create table if not exists public.premium_plans (
  id         uuid primary key default gen_random_uuid(),
  name       jsonb not null default '{"ha":"","en":""}'::jsonb,
  days       integer not null check (days between 1 and 3650),
  price_ngn  integer not null default 0 check (price_ngn >= 0),
  active     boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.payment_settings (
  id              integer primary key default 1 check (id = 1),
  instructions    jsonb not null default '{"ha":"","en":""}'::jsonb,
  account_details text not null default '' check (char_length(account_details) <= 1000),
  whatsapp        text not null default '' check (char_length(whatsapp) <= 30),
  updated_at      timestamptz not null default now()
);
insert into public.payment_settings (id, instructions) values (1, jsonb_build_object(
  'ha', 'Ka biya ta asusun da ke ƙasa, sannan ka danna “Na biya” ka rubuta lambar biyan kuɗi. Za a duba a buɗe maka.',
  'en', 'Pay to the account below, then tap “I have paid” and write the payment reference. We will check and unlock for you.'))
on conflict (id) do nothing;
-- placeholder plans (inactive, price 0): the admin edits the price and switches them on
insert into public.premium_plans (name, days, price_ngn, active, position)
select * from (values
  ('{"ha":"Wata 1","en":"1 month"}'::jsonb, 30, 0, false, 1),
  ('{"ha":"Wata 3","en":"3 months"}'::jsonb, 90, 0, false, 2),
  ('{"ha":"Shekara 1","en":"1 year"}'::jsonb, 365, 0, false, 3)) v(n, d, p, a, o)
where not exists (select 1 from public.premium_plans);

create table if not exists public.payment_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  plan_id     uuid references public.premium_plans(id) on delete set null,
  plan_name   jsonb not null,
  plan_days   integer not null,
  amount_ngn  integer not null default 0,
  reference   text not null check (char_length(reference) between 3 and 120),
  contact     text check (char_length(contact) <= 60),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note  text check (char_length(admin_note) <= 300),
  decided_by  uuid references auth.users(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists payment_requests_status_idx on public.payment_requests (status, created_at);
create table if not exists public.activation_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  days        integer not null check (days between 1 and 3650),
  note        text check (char_length(note) <= 200),
  active      boolean not null default true,
  expires_at  timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);
create table if not exists public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now()
);

do $$ declare t text; begin
  execute 'drop trigger if exists set_updated_at on public.payment_settings';
  execute 'create trigger set_updated_at before update on public.payment_settings for each row execute function public.set_updated_at()';
  foreach t in array array['premium_plans','payment_settings','payment_requests','activation_codes'] loop
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I for each row execute function public.log_admin_change()', t);
  end loop;
end $$;

-- ============================== row level security ==============================
alter table public.premium_plans    enable row level security;
alter table public.payment_settings enable row level security;
alter table public.payment_requests enable row level security;
alter table public.activation_codes enable row level security;
alter table public.code_attempts    enable row level security;
revoke all on public.activation_codes, public.code_attempts, public.payment_requests from anon;
revoke insert, update, delete on public.activation_codes, public.code_attempts, public.payment_requests from authenticated;
revoke insert, update, delete on public.premium_plans, public.payment_settings from anon;

drop policy if exists "plans: public read active" on public.premium_plans;
create policy "plans: public read active" on public.premium_plans for select to anon, authenticated using (active);
drop policy if exists "plans: super admin all" on public.premium_plans;
create policy "plans: super admin all" on public.premium_plans for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "pay settings: public read" on public.payment_settings;
create policy "pay settings: public read" on public.payment_settings for select to anon, authenticated using (true);
drop policy if exists "pay settings: super admin write" on public.payment_settings;
create policy "pay settings: super admin write" on public.payment_settings for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "payments: read own" on public.payment_requests;
create policy "payments: read own" on public.payment_requests for select to authenticated using (user_id = auth.uid());
-- activation_codes / code_attempts: no policy = reachable only through the functions below

-- ============================== internal helper ==============================
-- Adds premium days AFTER any premium the learner still has (so nobody loses paid time).
create or replace function public.grant_days(p_user uuid, p_days integer, p_source text, p_note text, p_by uuid) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare v_from timestamptz; v_end timestamptz;
begin
  select max(ends_at) into v_from from public.entitlements where user_id = p_user and ends_at > now();
  v_end := coalesce(v_from, now()) + make_interval(days => p_days);
  insert into public.entitlements (user_id, source, ends_at, note, granted_by) values (p_user, p_source, v_end, p_note, p_by);
  return v_end;
end $$;

-- ============================== learner functions ==============================
create or replace function public.submit_payment_request(p_plan uuid, p_reference text, p_contact text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_plan public.premium_plans; v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'create a profile first' using errcode = 'P0001'; end if;
  select * into v_plan from public.premium_plans where id = p_plan and active;
  if v_plan.id is null then raise exception 'this plan is not available' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_reference, ''))) < 3 or length(p_reference) > 120 then
    raise exception 'write the payment reference' using errcode = '22023'; end if;
  if length(coalesce(p_contact, '')) > 60 then raise exception 'contact is too long' using errcode = '22023'; end if;
  if (select count(*) from public.payment_requests where user_id = v_uid and status = 'pending') >= 3 then
    raise exception 'you already have requests waiting' using errcode = '54000'; end if;
  insert into public.payment_requests (user_id, plan_id, plan_name, plan_days, amount_ngn, reference, contact)
  values (v_uid, v_plan.id, v_plan.name, v_plan.days, v_plan.price_ngn, btrim(p_reference), nullif(btrim(coalesce(p_contact, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.my_payment_requests()
returns table (id uuid, plan_name jsonb, plan_days integer, amount_ngn integer, reference text, status text, admin_note text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.plan_name, r.plan_days, r.amount_ngn, r.reference, r.status, r.admin_note, r.created_at
  from public.payment_requests r where r.user_id = auth.uid() order by r.created_at desc limit 10;
$$;

create or replace function public.redeem_code(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
        v_row public.activation_codes; v_end timestamptz;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'create a profile first' using errcode = 'P0001'; end if;
  if (select count(*) from public.code_attempts where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts, try again later' using errcode = '54000'; end if;
  insert into public.code_attempts (user_id) values (v_uid);
  select * into v_row from public.activation_codes
   where code = v_code and active and redeemed_by is null and (expires_at is null or expires_at > now()) for update;
  if v_row.id is null then raise exception 'invalid code' using errcode = '22023'; end if;
  v_end := public.grant_days(v_uid, v_row.days, 'manual', 'activation code', v_row.created_by);
  update public.activation_codes set redeemed_by = v_uid, redeemed_at = now() where id = v_row.id;
  return jsonb_build_object('until', v_end);
end $$;

create or replace function public.my_premium() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('active', public.has_premium(auth.uid()),
    'until', (select max(e.ends_at) from public.entitlements e where e.user_id = auth.uid() and e.starts_at <= now() and e.ends_at > now()));
$$;

-- ============================== admin functions (Super Admin) ==============================
create or replace function public.admin_payment_requests(p_status text default 'pending')
returns table (id uuid, user_id uuid, nickname text, plan_name jsonb, plan_days integer, amount_ngn integer, reference text, contact text,
               status text, admin_note text, created_at timestamptz, decided_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select r.id, r.user_id, p.nickname, r.plan_name, r.plan_days, r.amount_ngn, r.reference, r.contact, r.status, r.admin_note, r.created_at, r.decided_at
    from public.payment_requests r left join public.profiles p on p.id = r.user_id
    where p_status is null or r.status = p_status
    order by r.created_at desc limit 300;
end $$;

create or replace function public.admin_decide_payment(p_id uuid, p_approve boolean, p_note text) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare r public.payment_requests; v_end timestamptz;
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into r from public.payment_requests where id = p_id for update;
  if r.id is null then raise exception 'request not found' using errcode = '22023'; end if;
  if r.status <> 'pending' then raise exception 'this request was already decided' using errcode = '22023'; end if;
  if p_approve then v_end := public.grant_days(r.user_id, r.plan_days, 'payment', 'payment request ' || r.id::text, auth.uid()); end if;
  update public.payment_requests set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = nullif(btrim(coalesce(p_note, '')), ''), decided_by = auth.uid(), decided_at = now() where id = p_id;
  return v_end;
end $$;

create or replace function public.admin_create_codes(p_days integer, p_count integer, p_note text) returns table (code text)
language plpgsql volatile security definer set search_path = '' as $$
declare i integer; v text;
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_days is null or p_days < 1 or p_days > 3650 then raise exception 'days must be 1 to 3650' using errcode = '22023'; end if;
  if p_count is null or p_count < 1 or p_count > 200 then raise exception 'count must be 1 to 200' using errcode = '22023'; end if;
  for i in 1 .. p_count loop
    v := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.activation_codes (code, days, note, created_by) values (v, p_days, nullif(btrim(coalesce(p_note, '')), ''), auth.uid());
    code := v; return next;
  end loop;
end $$;

create or replace function public.admin_list_codes()
returns table (id uuid, code text, days integer, note text, active boolean, redeemed_by_nickname text, redeemed_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select c.id, c.code, c.days, c.note, c.active, p.nickname, c.redeemed_at, c.created_at
    from public.activation_codes c left join public.profiles p on p.id = c.redeemed_by
    order by c.created_at desc limit 500;
end $$;

create or replace function public.admin_revoke_code(p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.activation_codes set active = false where id = p_id and redeemed_by is null;
end $$;

-- THE APP LOCK: free missions stay open (free trial); every other mission becomes premium (locked until paid).
-- Pass every slug to open the whole app, or an empty list to lock all of it.
create or replace function public.admin_set_access(p_free text[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_free integer; v_premium integer;
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.missions set access = case when slug = any (coalesce(p_free, '{}')) then 'free' else 'premium' end
   where access is distinct from case when slug = any (coalesce(p_free, '{}')) then 'free' else 'premium' end;
  select count(*) filter (where access = 'free'), count(*) filter (where access = 'premium') into v_free, v_premium from public.missions;
  return jsonb_build_object('free', v_free, 'premium', v_premium);
end $$;

create or replace function public.admin_live_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_admin_role(array['learning_analyst']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'online_now',   (select count(*) from public.profiles where last_active_at > now() - interval '5 minutes'),
    'active_today', (select count(*) from public.profiles where last_active_at >= date_trunc('day', now())),
    'active_7d',    (select count(*) from public.profiles where last_active_at > now() - interval '7 days'),
    'new_today',    (select count(*) from public.profiles where created_at >= date_trunc('day', now())),
    'total',        (select count(*) from public.profiles),
    'organizations',(select count(*) from public.organizations),
    'premium_learners', (select count(*) from public.profiles p where public.has_premium(p.id)),
    'pending_payments', (select count(*) from public.payment_requests where status = 'pending'));
end $$;

-- ============================== privileges ==============================
revoke all on function
  public.grant_days(uuid, integer, text, text, uuid), public.submit_payment_request(uuid, text, text), public.my_payment_requests(),
  public.redeem_code(text), public.my_premium(), public.admin_payment_requests(text), public.admin_decide_payment(uuid, boolean, text),
  public.admin_create_codes(integer, integer, text), public.admin_list_codes(), public.admin_revoke_code(uuid), public.admin_set_access(text[]),
  public.admin_live_stats()
from public, anon;
revoke all on function public.grant_days(uuid, integer, text, text, uuid) from authenticated;   -- internal only
grant execute on function
  public.submit_payment_request(uuid, text, text), public.my_payment_requests(), public.redeem_code(text), public.my_premium(),
  public.admin_payment_requests(text), public.admin_decide_payment(uuid, boolean, text), public.admin_create_codes(integer, integer, text),
  public.admin_list_codes(), public.admin_revoke_code(uuid), public.admin_set_access(text[]), public.admin_live_stats()
to authenticated;
