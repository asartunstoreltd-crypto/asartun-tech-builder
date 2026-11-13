-- Create the FIRST Super Admin. Run ONCE, in the Supabase SQL Editor (runs as the project owner,
-- which is the only place that can bypass RLS — the app itself can never grant the first admin).
--
-- 1) Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--    Use a real, private email, a long unique password, and tick "Auto Confirm User".
-- 2) Replace the email below with that exact email, then run this script.
do $$
declare v_user uuid;
begin
  select id into v_user from auth.users where email = 'REPLACE-WITH-YOUR-ADMIN-EMAIL@example.com';
  if v_user is null then raise exception 'No auth user with that email. Create the user first (step 1).'; end if;
  insert into public.admin_roles (user_id, role) values (v_user, 'super_admin')
  on conflict (user_id, role) do nothing;
  raise notice 'Super Admin granted to %', v_user;
end $$;
-- After this, sign in at /admin/login. Further admins are added by this Super Admin from the
-- panel (Roles module, next phase) or with the same insert using role 'content_manager', etc.
