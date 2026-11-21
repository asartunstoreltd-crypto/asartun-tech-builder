-- Database tests for migration 027 (staff management & class assignments).
-- STATUS: WRITTEN BUT NOT RUN. No Postgres/Supabase was available where this was authored. Run it in the SQL editor of a TEST project
-- (never production) AFTER migrations 017-027. Everything happens inside one transaction that is ROLLED BACK at the end.
-- If a fixture insert fails (for example a trigger on auth.users in your project), adjust the fixture, not the assertions.
-- Result: if the last statement prints 'ALL 027 CHECKS PASSED' every assertion held. Any failure raises an exception naming the check.
begin;

-- helpers --------------------------------------------------------------------------------------------------------------
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.denied(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;
create function pg_temp.fails_with(q text, msg text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return sqlerrm ilike '%' || msg || '%'; end $$;

-- fixtures (as the table owner) -----------------------------------------------------------------------------------------
reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin1@test.local'), ('00000000-0000-0000-0000-0000000000a2', 'admin2@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'teacher-a@test.local'), ('00000000-0000-0000-0000-0000000000b2', 'teacher-b@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'superonly@test.local'),                      -- will get admin_roles ONLY (no adult_staff)
  ('00000000-0000-0000-0000-0000000000d1', 'l1@test.local'), ('00000000-0000-0000-0000-0000000000d2', 'l2@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'l3@test.local');
insert into public.adult_staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'adult_admin'), ('00000000-0000-0000-0000-0000000000a2', 'adult_admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'facilitator'), ('00000000-0000-0000-0000-0000000000b2', 'facilitator');
insert into public.admin_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'super_admin') on conflict do nothing;
insert into public.adult_profiles (id, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000d1', 'Learner One', '+2348010000001'), ('00000000-0000-0000-0000-0000000000d2', 'Learner Two', '+2348010000002'), ('00000000-0000-0000-0000-0000000000d3', 'Learner Three', '+2348010000003');
insert into public.adult_classes (id, name) values
  ('00000000-0000-0000-0000-00000000c0a1', 'Class A'), ('00000000-0000-0000-0000-00000000c0b2', 'Class B'), ('00000000-0000-0000-0000-00000000c0c3', 'Class C');
insert into public.adult_classes (id, name, status) values ('00000000-0000-0000-0000-00000000c0d4', 'Closed class', 'closed');
-- Class A: 2 learners (one of them has LEFT -> must not be counted); Class B: 1; Class C: 0
insert into public.adult_class_members (class_id, learner_id, left_at) values
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-0000000000d1', null),
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-0000000000d2', now()),
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-0000000000d3', null),
  ('00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-0000000000d1', null);

-- 1. only an ACTIVE adult admin may use the functions ------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin assert pg_temp.denied($q$select public.adult_admin_list_staff()$q$), 'teacher must NOT list staff'; end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  assert pg_temp.denied($q$select public.adult_admin_list_staff()$q$), 'a Super Admin WITHOUT adult_staff must NOT use adult staff functions';
  assert pg_temp.denied($q$select public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0a1')$q$), 'super-admin-only cannot assign classes';
end $$;
reset role;
set local role anon;
do $$ begin assert pg_temp.denied($q$select public.adult_admin_list_staff()$q$), 'anon must NOT call staff functions'; end $$;
reset role;

-- 2. assignment, duplicates, learner counts ----------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ declare r jsonb; a jsonb; begin
  assert public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c0a1') = true, 'first assignment is new';
  assert public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c0a1') = false, 'duplicate assignment creates nothing';
  perform public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c0b2');   -- Teacher A: two classes
  perform public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c0c3');   -- Teacher B: one class
  r := public.adult_admin_list_staff();
  assert jsonb_array_length(r) = 4, 'every staff row is listed (2 admins + 2 teachers)';
  select x into a from jsonb_array_elements(r) x where x->>'user_id' = '00000000-0000-0000-0000-0000000000b1';
  assert jsonb_array_length(a->'classes') = 2, 'Teacher A has 2 classes';
  assert (select (c->>'learners')::int from jsonb_array_elements(a->'classes') c where c->>'name' = 'Class A') = 2, 'Class A counts 2 (the learner who LEFT is not counted)';
  assert (select (c->>'learners')::int from jsonb_array_elements(a->'classes') c where c->>'name' = 'Class B') = 1, 'Class B counts 1';
  select x into a from jsonb_array_elements(r) x where x->>'user_id' = '00000000-0000-0000-0000-0000000000b2';
  assert (a->'classes'->0->>'learners')::int = 0, 'Class C counts 0';
  assert exists (select 1 from public.adult_class_staff where user_id = '00000000-0000-0000-0000-0000000000b1' and assigned_by = '00000000-0000-0000-0000-0000000000a1' and assigned_at is not null), 'assignment records who and when';
  assert pg_temp.fails_with($q$select public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000c0a1')$q$, 'only facilitators'), 'cannot assign classes to an adult admin';
  assert pg_temp.fails_with($q$select public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0d4')$q$, 'closed'), 'cannot assign a closed class';
  assert pg_temp.fails_with($q$select public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000ff')$q$, 'no such class'), 'unknown class refused';
end $$;
reset role;

-- 3. a teacher sees ONLY assigned classes and learners ------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');                     -- Teacher B: class C only (empty)
do $$ begin
  assert (select count(*) from public.adult_classes) = 1, 'Teacher B sees only their own class';
  assert not exists (select 1 from public.adult_class_members), 'Teacher B sees no members of other classes';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');                     -- Teacher A: classes A and B
do $$ begin assert (select count(*) from public.adult_classes) = 2, 'Teacher A sees exactly their two classes'; end $$;
reset role;

-- 4. reassignment takes effect immediately -----------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.adult_admin_reassign_class('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-00000000c0c3');
  assert not exists (select 1 from public.adult_class_staff where user_id = '00000000-0000-0000-0000-0000000000b1' and class_id = '00000000-0000-0000-0000-00000000c0b2'), 'old class removed';
  assert exists (select 1 from public.adult_class_staff where user_id = '00000000-0000-0000-0000-0000000000b1' and class_id = '00000000-0000-0000-0000-00000000c0c3'), 'new class added';
  assert pg_temp.fails_with($q$select public.adult_admin_reassign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0b2','00000000-0000-0000-0000-00000000c0a1')$q$, 'not assigned'), 'cannot move from a class they do not have';
  assert pg_temp.fails_with($q$select public.adult_admin_reassign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0a1','00000000-0000-0000-0000-00000000c0c3')$q$, 'already assigned'), 'cannot move onto a class they already have';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin assert not exists (select 1 from public.adult_classes where name = 'Class B'), 'Teacher A lost Class B at once'; end $$;
reset role;

-- 5. suspension --------------------------------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.adult_admin_set_staff_active('00000000-0000-0000-0000-0000000000b1', false);
  assert pg_temp.fails_with($q$select public.adult_admin_assign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0b2')$q$, 'suspended'), 'cannot assign classes to a suspended teacher';
  assert pg_temp.fails_with($q$select public.adult_admin_set_staff_active('00000000-0000-0000-0000-0000000000a1', false)$q$, 'own status'), 'cannot suspend yourself';
  assert exists (select 1 from public.adult_staff where user_id = '00000000-0000-0000-0000-0000000000b1' and not active and suspended_at is not null and suspended_by = '00000000-0000-0000-0000-0000000000a1'), 'suspension recorded';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select count(*) from public.adult_classes) = 0, 'a SUSPENDED teacher sees no classes (their old JWT still works, the data does not)';
  assert (select count(*) from public.adult_class_members) = 0, 'a SUSPENDED teacher sees no learners';
  assert pg_temp.denied($q$select public.adult_admin_list_staff()$q$), 'a suspended teacher cannot use admin functions';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.adult_admin_set_staff_active('00000000-0000-0000-0000-0000000000b1', true);
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin assert (select count(*) from public.adult_classes) = 2, 'reactivated teacher regains the classes still assigned (A and C)'; end $$;
reset role;
-- the last active adult admin cannot be suspended
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.adult_admin_set_staff_active('00000000-0000-0000-0000-0000000000a2', false);                       -- now a1 is the only active admin
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin assert pg_temp.denied($q$select public.adult_admin_list_staff()$q$), 'a suspended adult admin loses the admin functions at once'; end $$;
reset role;

-- 6. profile, unassign, activity, audit, direct writes -----------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.adult_admin_set_staff_profile('00000000-0000-0000-0000-0000000000b1', '  Amina Yusuf ', '+2348031234567');
  assert (select full_name from public.adult_staff where user_id = '00000000-0000-0000-0000-0000000000b1') = 'Amina Yusuf', 'name saved trimmed';
  assert pg_temp.fails_with($q$select public.adult_admin_set_staff_profile('00000000-0000-0000-0000-0000000000b2','Other','+2348031234567')$q$, 'phone already used'), 'duplicate staff phone refused';
  assert pg_temp.fails_with($q$select public.adult_admin_set_staff_profile('00000000-0000-0000-0000-0000000000b2','Other','12345')$q$, 'bad phone'), 'bad phone refused';
  perform public.adult_admin_unassign_class('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c0a1');
  assert pg_temp.fails_with($q$select public.adult_admin_unassign_class('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c0a1')$q$, 'not assigned'), 'unassigning twice is refused';
  assert jsonb_typeof(public.adult_admin_staff_activity('00000000-0000-0000-0000-0000000000b1')->'recent') = 'array', 'activity returns a list';
  assert (public.adult_admin_staff_submissions('00000000-0000-0000-0000-0000000000b1')->>'reviewed_total')::int = 0, 'submissions summary works';
  assert exists (select 1 from public.adult_audit_log where action in ('assign_class','reassign_class','unassign_class','suspend_staff','reactivate_staff') and actor_id = '00000000-0000-0000-0000-0000000000a1'), 'changes are in the audit log';
  assert pg_temp.denied($q$update public.adult_staff set active = false where user_id = '00000000-0000-0000-0000-0000000000b2'$q$) or (select active from public.adult_staff where user_id = '00000000-0000-0000-0000-0000000000b2'), 'browser role cannot update adult_staff directly';
  assert pg_temp.denied($q$insert into public.adult_class_staff (class_id, user_id) values ('00000000-0000-0000-0000-00000000c0a1','00000000-0000-0000-0000-0000000000b2')$q$), 'browser role cannot insert assignments directly';
end $$;
reset role;

select 'ALL 027 CHECKS PASSED' as result;
rollback;
