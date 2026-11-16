-- Create the FIRST Adult Learning admin. Run ONCE in the Supabase SQL Editor (after migration 017).
-- 1) Authentication -> Users -> Add user -> Create new user (private email, long password, tick Auto Confirm).
--    Use a SEPARATE login from your /admin Super Admin if you want the two areas kept apart.
-- 2) Put that exact email below and run.
do $$
declare v_user uuid;
begin
  select id into v_user from auth.users where email = 'REPLACE-WITH-ADULT-ADMIN-EMAIL@example.com';
  if v_user is null then raise exception 'No auth user with that email. Create the user first (step 1).'; end if;
  insert into public.adult_staff (user_id, role) values (v_user, 'adult_admin')
  on conflict (user_id) do update set role = 'adult_admin', active = true;
  raise notice 'Adult admin granted to %', v_user;
end $$;
-- Then sign in at /adult/teach. Facilitators are created from the "Staff" tab there.
