-- ASARTUN ADULT LEARNING — Migration 025: wrong-PIN lock and housekeeping (Phase 9, security review).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-024.  Only ADDS objects.
--
-- THE PROBLEM: an adult's password is a 6-digit PIN, so someone who knows a phone number could try many PINs.
-- THE FIX (needs one dashboard step, see below): after 5 wrong PINs within 15 minutes, that learner's login is refused for 15 minutes,
-- EVEN with the right PIN (otherwise the lock would only slow down guessing the last digit). A facilitator's PIN reset clears the lock.
-- * It works through Supabase Auth's "Password Verification Attempt" hook. That hook is a Supabase Pro-plan feature.
--   Until you register it (Dashboard → Authentication → Hooks → Password verification → choose public.adult_password_hook), this
--   function does nothing and nothing else changes. NOT TESTED against a real Supabase Auth.
-- * It only ever looks at accounts that are adult LEARNERS (a row in adult_profiles). Staff and the children's app are never locked by it.
-- * Trade-off: someone can also lock a victim out for 15 minutes by typing wrong PINs. The lock is short and staff can clear it by resetting the PIN.

create table if not exists public.adult_pin_failures (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  failures     integer not null default 0,
  last_failure timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.adult_pin_failures enable row level security;       -- no policy and no grant: only the functions below touch it
revoke all on public.adult_pin_failures from anon, authenticated;

create or replace function public.adult_password_hook(event jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_user uuid; v_valid boolean; r public.adult_pin_failures; v_n integer;
begin
  v_user := nullif(event->>'user_id', '')::uuid;
  v_valid := coalesce((event->>'valid')::boolean, false);
  if v_user is null or not exists (select 1 from public.adult_profiles where id = v_user) then
    return jsonb_build_object('decision', 'continue');
  end if;
  select * into r from public.adult_pin_failures where user_id = v_user;
  if r.user_id is not null and r.locked_until is not null and r.locked_until > now() then
    return jsonb_build_object('decision', 'reject', 'message', 'Too many wrong PINs. Wait 15 minutes, or ask your facilitator to reset your PIN.');
  end if;
  if v_valid then
    delete from public.adult_pin_failures where user_id = v_user;
    return jsonb_build_object('decision', 'continue');
  end if;
  v_n := case when r.user_id is null or r.last_failure < now() - interval '15 minutes' then 1 else r.failures + 1 end;
  insert into public.adult_pin_failures (user_id, failures, last_failure, locked_until)
  values (v_user, v_n, now(), case when v_n >= 5 then now() + interval '15 minutes' else null end)
  on conflict (user_id) do update set failures = excluded.failures, last_failure = excluded.last_failure, locked_until = excluded.locked_until;
  return jsonb_build_object('decision', 'continue');
end $$;

-- Old attempt records are deleted once a day by the purge job (service key only).
create or replace function public.adult_cleanup_attempts() returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.adult_register_attempts where at < now() - interval '7 days';
  delete from public.adult_code_attempts where at < now() - interval '7 days';
  delete from public.adult_pin_failures where last_failure < now() - interval '30 days' and (locked_until is null or locked_until < now());
$$;

do $$
begin
  revoke all on function public.adult_password_hook(jsonb) from public, anon, authenticated;
  revoke all on function public.adult_cleanup_attempts() from public, anon, authenticated;
  grant execute on function public.adult_cleanup_attempts() to service_role;
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.adult_password_hook(jsonb) to supabase_auth_admin;
  end if;
end $$;
