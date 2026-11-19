-- ASARTUN ADULT LEARNING — Migration 023: course pricing controls, manual payments, activation codes (Phase 8B).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-022.  Only ADDS objects; no existing function is replaced.
--
-- * The adult admin decides, per course, whether it is free or premium, its price and how long access lasts (adult_admin_set_course).
-- * A learner pays OUTSIDE the app (bank transfer, cash, agent, mobile money), then either taps "I have paid" with a reference
--   (the adult admin checks the money really arrived, then verifies) or types a one-time activation code.
-- * Access starts only when the DATABASE grants it (adult_grant_access): enrolment with ends_at = now + the course's access days,
--   added after any access the learner still has. Lessons are already refused after ends_at (adult_record_lesson).
-- * No card numbers, PINs or secret keys are stored. Online payment (Paystack / Flutterwave) is NOT connected: the columns
--   method = 'online', provider and provider_ref exist so it can be added later, but no function writes them yet.
-- * Courses made premium AFTER learners joined them free keep their access (their enrolment has no end date). Say so to the admin.
-- * Browser roles can only SELECT (payment info, own payments). Codes are stored only as a hash and are shown once, to the admin.

-- ---------- how to pay (one row, edited by the adult admin, read by learners) ----------
create table if not exists public.adult_payment_info (
  id              boolean primary key default true check (id),
  instructions    jsonb not null default '{"ha":"","en":""}'::jsonb,
  account_details text not null default '' check (char_length(account_details) <= 600),
  whatsapp        text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{8,15}$'),
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now()
);
insert into public.adult_payment_info (id) values (true) on conflict do nothing;

create table if not exists public.adult_payments (
  id            uuid primary key default gen_random_uuid(),
  learner_id    uuid not null references public.adult_profiles(id) on delete cascade,
  course_id     uuid not null references public.adult_courses(id) on delete restrict,
  amount_ngn    integer not null check (amount_ngn >= 0),                -- the price when the learner asked
  access_days   integer check (access_days is null or access_days > 0),   -- the duration when the learner asked (null = no end)
  method        text not null default 'manual' check (method in ('manual','code','online')),
  reference     text check (reference is null or char_length(reference) between 3 and 60),
  provider      text,                                                     -- reserved for online payment (not used yet)
  provider_ref  text unique,                                              -- reserved for online payment (not used yet)
  status        text not null default 'pending' check (status in ('pending','verified','rejected','cancelled')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 200),
  decided_by    uuid references auth.users(id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists adult_payments_one_pending on public.adult_payments (learner_id, course_id) where status = 'pending';
create index if not exists adult_payments_status_idx on public.adult_payments (status, created_at desc);
create index if not exists adult_payments_learner_idx on public.adult_payments (learner_id, created_at desc);

create table if not exists public.adult_activation_codes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.adult_courses(id) on delete cascade,
  code_hash   text not null unique,
  hint        text not null,                                              -- last 4 characters, so the admin can recognise a code
  note        text check (note is null or char_length(note) <= 80),       -- e.g. the agent it was given to
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  redeemed_by uuid references public.adult_profiles(id) on delete set null,
  redeemed_at timestamptz,
  payment_id  uuid references public.adult_payments(id) on delete set null
);
create table if not exists public.adult_code_attempts (
  id         bigserial primary key,
  learner_id uuid not null references public.adult_profiles(id) on delete cascade,
  at         timestamptz not null default now(),
  ok         boolean not null default false
);
create index if not exists adult_code_attempts_idx on public.adult_code_attempts (learner_id, at);

-- ---------- Row Level Security: read only ----------
alter table public.adult_payment_info     enable row level security;
alter table public.adult_payments         enable row level security;
alter table public.adult_activation_codes enable row level security;
alter table public.adult_code_attempts    enable row level security;

drop policy if exists "adult_payment_info: read" on public.adult_payment_info;
create policy "adult_payment_info: read" on public.adult_payment_info for select to authenticated
  using (public.is_adult_staff() or public.is_adult_learner());
-- a learner reads only their own payments; only the ADULT ADMIN reads everyone's (facilitators never see payments)
drop policy if exists "adult_payments: own or admin" on public.adult_payments;
create policy "adult_payments: own or admin" on public.adult_payments for select to authenticated
  using (learner_id = auth.uid() or public.is_adult_staff(array['adult_admin']));
-- codes and attempts have NO policy and NO grant: only the security definer functions below touch them

revoke all on public.adult_payment_info, public.adult_payments, public.adult_activation_codes, public.adult_code_attempts from anon, authenticated;
grant select on public.adult_payment_info, public.adult_payments to authenticated;

-- ---------- internal: give access (called only by the functions below) ----------
-- A new enrolment, or an extension added AFTER any access still running. An enrolment with no end date is never shortened.
create or replace function public.adult_grant_access(p_learner uuid, p_course uuid, p_source text) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; e public.adult_enrollments; v_end timestamptz;
begin
  select * into c from public.adult_courses where id = p_course;
  if c.id is null then raise exception 'course not available' using errcode = 'P0001'; end if;
  select * into e from public.adult_enrollments where learner_id = p_learner and course_id = p_course;
  if e.id is null then
    v_end := case when c.access_days is null then null else now() + make_interval(days => c.access_days) end;
    insert into public.adult_enrollments (learner_id, course_id, source, ends_at) values (p_learner, p_course, p_source, v_end);
    return v_end;
  end if;
  if e.ends_at is null then return null; end if;
  v_end := case when c.access_days is null then null else greatest(now(), e.ends_at) + make_interval(days => c.access_days) end;
  update public.adult_enrollments set ends_at = v_end, source = p_source where id = e.id;
  return v_end;
end $$;

-- ---------- admin: which courses are free or premium ----------
create or replace function public.adult_admin_set_course(p_course uuid, p_status text, p_free boolean, p_price integer, p_days integer) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('draft','published','coming_soon','archived') then raise exception 'bad course' using errcode = 'P0001'; end if;
  if p_free is null then raise exception 'bad course' using errcode = 'P0001'; end if;
  if p_free then
    p_price := 0; p_days := null;
  else
    if p_price is null or p_price < 1 or p_price > 10000000 then raise exception 'bad price' using errcode = 'P0001'; end if;
    if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'bad course' using errcode = 'P0001'; end if;
  end if;
  update public.adult_courses set status = p_status, is_free = p_free, price_ngn = p_price, access_days = p_days, updated_at = now() where id = p_course;
  if not found then raise exception 'course not available' using errcode = 'P0001'; end if;
  perform public.adult_log('set_course', null, jsonb_build_object('course', p_course, 'status', p_status, 'free', p_free, 'price', p_price, 'days', p_days));
end $$;

create or replace function public.adult_admin_set_payment_info(p_instructions jsonb, p_account text, p_whatsapp text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if jsonb_typeof(p_instructions) <> 'object' or char_length(coalesce(p_instructions->>'ha', '')) > 1000 or char_length(coalesce(p_instructions->>'en', '')) > 1000
     or char_length(coalesce(p_account, '')) > 600 or (nullif(btrim(coalesce(p_whatsapp, '')), '') is not null and btrim(p_whatsapp) !~ '^\+?[0-9]{8,15}$') then
    raise exception 'bad payment info' using errcode = 'P0001';
  end if;
  update public.adult_payment_info set instructions = jsonb_build_object('ha', coalesce(p_instructions->>'ha', ''), 'en', coalesce(p_instructions->>'en', '')),
    account_details = coalesce(p_account, ''), whatsapp = nullif(btrim(coalesce(p_whatsapp, '')), ''), updated_by = auth.uid(), updated_at = now() where id;
  perform public.adult_log('set_payment_info', null, '{}'::jsonb);
end $$;

-- ---------- learner: "I have paid", cancel, activation code ----------
create or replace function public.adult_request_payment(p_course uuid, p_reference text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; e public.adult_enrollments; v uuid; v_ref text := btrim(coalesce(p_reference, ''));
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_courses where id = p_course;
  if c.id is null or c.status <> 'published' or c.is_free then raise exception 'course not available' using errcode = 'P0001'; end if;
  if char_length(v_ref) not between 3 and 60 or v_ref !~ '^[0-9A-Za-z .,/_-]+$' then raise exception 'bad reference' using errcode = 'P0001'; end if;
  select * into e from public.adult_enrollments where learner_id = auth.uid() and course_id = c.id;
  if e.id is not null and e.ends_at is null then raise exception 'already has access' using errcode = 'P0001'; end if;
  if (select count(*) from public.adult_payments p where p.learner_id = auth.uid() and p.status = 'pending') >= 3 then raise exception 'too many waiting' using errcode = 'P0001'; end if;
  begin
    insert into public.adult_payments (learner_id, course_id, amount_ngn, access_days, method, reference)
    values (auth.uid(), c.id, c.price_ngn, c.access_days, 'manual', v_ref) returning id into v;
  exception when unique_violation then
    raise exception 'already waiting' using errcode = 'P0001';
  end;
  return v;
end $$;

create or replace function public.adult_cancel_payment(p_payment uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.adult_payments set status = 'cancelled', decided_at = now() where id = p_payment and learner_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not authorized' using errcode = '42501'; end if;
end $$;

create or replace function public.adult_redeem_code(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_norm text; v_hash text; k public.adult_activation_codes; c public.adult_courses; v_end timestamptz; v_pay uuid; v_att bigint;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  if (select count(*) from public.adult_code_attempts a where a.learner_id = auth.uid() and a.at > now() - interval '1 hour') >= 10 then raise exception 'too many code tries' using errcode = 'P0001'; end if;
  insert into public.adult_code_attempts (learner_id) values (auth.uid()) returning id into v_att;
  v_norm := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
  if char_length(v_norm) <> 12 then raise exception 'bad code' using errcode = 'P0001'; end if;
  v_hash := encode(sha256(convert_to(v_norm, 'utf8')), 'hex');
  select * into k from public.adult_activation_codes where code_hash = v_hash and redeemed_at is null and (expires_at is null or expires_at > now()) for update;
  if k.id is null then raise exception 'bad code' using errcode = 'P0001'; end if;
  select * into c from public.adult_courses where id = k.course_id;
  if c.id is null or c.status <> 'published' or c.is_free then raise exception 'course not available' using errcode = 'P0001'; end if;
  v_end := public.adult_grant_access(auth.uid(), c.id, 'payment');
  insert into public.adult_payments (learner_id, course_id, amount_ngn, access_days, method, reference, status, decided_at)
  values (auth.uid(), c.id, c.price_ngn, c.access_days, 'code', 'code ' || k.hint, 'verified', now()) returning id into v_pay;
  update public.adult_activation_codes set redeemed_by = auth.uid(), redeemed_at = now(), payment_id = v_pay where id = k.id;
  update public.adult_code_attempts set ok = true where id = v_att;
  return jsonb_build_object('course_id', c.id, 'ends_at', v_end);
end $$;

-- ---------- admin: check a payment, codes, history ----------
create or replace function public.adult_admin_verify_payment(p_payment uuid) returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare p public.adult_payments; v_end timestamptz;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into p from public.adult_payments where id = p_payment for update;
  if p.id is null then raise exception 'payment not found' using errcode = 'P0001'; end if;
  if p.status <> 'pending' then raise exception 'payment already decided' using errcode = 'P0001'; end if;
  v_end := public.adult_grant_access(p.learner_id, p.course_id, 'payment');
  update public.adult_payments set status = 'verified', decided_by = auth.uid(), decided_at = now() where id = p.id;
  perform public.adult_log('verify_payment', p.learner_id, jsonb_build_object('payment', p.id, 'course', p.course_id));
  return v_end;
end $$;

create or replace function public.adult_admin_reject_payment(p_payment uuid, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if char_length(coalesce(p_reason, '')) > 200 then raise exception 'bad reason' using errcode = 'P0001'; end if;
  update public.adult_payments set status = 'rejected', reject_reason = nullif(btrim(coalesce(p_reason, '')), ''), decided_by = auth.uid(), decided_at = now()
   where id = p_payment and status = 'pending';
  if not found then raise exception 'payment already decided' using errcode = 'P0001'; end if;
  perform public.adult_log('reject_payment', null, jsonb_build_object('payment', p_payment));
end $$;

create or replace function public.adult_admin_payments(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status is not null and p_status not in ('pending','verified','rejected','cancelled') then raise exception 'bad status' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select p.id, p.status, p.method, p.reference, p.amount_ngn, p.access_days, p.reject_reason, p.created_at, p.decided_at, p.course_id,
           pr.full_name as learner_name, pr.phone as learner_phone, co.title as course_title
      from public.adult_payments p join public.adult_profiles pr on pr.id = p.learner_id join public.adult_courses co on co.id = p.course_id
     where (p_status is null or p.status = p_status) order by p.created_at desc limit 300) x), '[]'::jsonb);
end $$;

-- Codes: shown to the admin ONCE, here. Only a hash is stored.
create or replace function public.adult_admin_create_codes(p_course uuid, p_count integer, p_note text, p_valid_days integer) returns text[]
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; out text[] := '{}'; raw text; n integer := 0; tries integer := 0;
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_courses where id = p_course;
  if c.id is null or c.is_free then raise exception 'course not available' using errcode = 'P0001'; end if;
  if p_count is null or p_count < 1 or p_count > 100 or coalesce(p_valid_days, 90) < 1 or coalesce(p_valid_days, 90) > 365 or char_length(coalesce(p_note, '')) > 80 then raise exception 'bad codes' using errcode = 'P0001'; end if;
  while n < p_count and tries < p_count * 5 loop
    tries := tries + 1;
    raw := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    begin
      insert into public.adult_activation_codes (course_id, code_hash, hint, note, created_by, expires_at)
      values (c.id, encode(sha256(convert_to(raw, 'utf8')), 'hex'), substr(raw, 9, 4), nullif(btrim(coalesce(p_note, '')), ''), auth.uid(), now() + make_interval(days => coalesce(p_valid_days, 90)));
      out := out || (substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4));
      n := n + 1;
    exception when unique_violation then null;
    end;
  end loop;
  if n < p_count then raise exception 'bad codes' using errcode = 'P0001'; end if;
  perform public.adult_log('create_codes', null, jsonb_build_object('course', c.id, 'count', n));
  return out;
end $$;

create or replace function public.adult_admin_codes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select k.id, k.hint, k.note, k.created_at, k.expires_at, k.redeemed_at, co.title as course_title, pr.full_name as redeemed_by_name,
           case when k.redeemed_at is not null then 'used' when k.expires_at is not null and k.expires_at < now() then 'expired' else 'unused' end as state
      from public.adult_activation_codes k join public.adult_courses co on co.id = k.course_id left join public.adult_profiles pr on pr.id = k.redeemed_by
     order by k.created_at desc limit 300) x), '[]'::jsonb);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'adult_admin_set_course(uuid,text,boolean,integer,integer)','adult_admin_set_payment_info(jsonb,text,text)','adult_request_payment(uuid,text)','adult_cancel_payment(uuid)',
    'adult_redeem_code(text)','adult_admin_verify_payment(uuid)','adult_admin_reject_payment(uuid,text)','adult_admin_payments(text)',
    'adult_admin_create_codes(uuid,integer,text,integer)','adult_admin_codes()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- adult_grant_access is internal: nobody can call it directly
  revoke all on function public.adult_grant_access(uuid,uuid,text) from public, anon, authenticated;
end $$;
