-- ASARTUN TECH BUILDER — Migration 012: award_progress() now enforces age, school curriculum and premium
-- Owner: ASARTUN STORE LIMITED.  Run AFTER 001-006, 010 and 011.  Safe to run twice (create or replace).
-- Why: before this, a modified app could call award_progress('<mission>:finish') for ANY published mission,
-- including lessons locked by age, by the school's curriculum or by premium. Points and badges are now refused
-- with error 22023, which the app already treats as "refused for good" (learnerSync.js drops that key).
-- Honest limit: a modified app can still claim keys of lessons it IS allowed to open, without doing the activities.
-- Real proof of work needs server-checked activities (planned in the competency/portfolio phase).
-- Existing grants on the function are kept by create or replace.

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

  -- NEW (012): the same rules the read policies enforce. A modified app can no longer collect points
  -- for a lesson its age, school curriculum or premium status does not allow it to open.
  if not public.age_ok(v_mission.level_id, v_mission.risk_level, v_uid)
     or not public.in_curriculum(v_mission.id, v_uid)
     or not (coalesce(v_mission.access, 'free') = 'free' or public.has_premium(v_uid)) then
    raise exception 'this lesson is not available to this learner' using errcode = '22023';
  end if;

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
