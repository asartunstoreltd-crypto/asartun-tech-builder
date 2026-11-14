-- ASARTUN TECH BUILDER — Migration 008: list of school/company staff accounts (Super Admin only)
-- Run AFTER 001-007. Safe to run twice. (The accounts themselves are created by the Edge Function "staff-admin".)
create or replace function public.admin_all_staff()
returns table (id uuid, org_id uuid, org_name text, user_id uuid, email text, role text, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select m.id, m.org_id, o.name, m.user_id, u.email::text, m.role, u.last_sign_in_at, m.created_at
    from public.org_members m
    join public.organizations o on o.id = m.org_id
    join auth.users u on u.id = m.user_id
    order by o.name, u.email;
end $$;
revoke all on function public.admin_all_staff() from public, anon;
grant execute on function public.admin_all_staff() to authenticated;
