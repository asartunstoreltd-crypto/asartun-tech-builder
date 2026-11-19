-- ASARTUN ADULT LEARNING — Migration 024: certificates of course completion (Phase 8C).
-- DRAFT FOR REVIEW — not executed anywhere. Prerequisite: 017-023.  Only ADDS objects (one column on our adult_courses).
--
-- * A certificate says: the person completed an ASARTUN course. It never says or implies government accreditation.
-- * There is NO public check page: a certificate can be read only by its owner and by staff (a facilitator: learners of their classes).
-- * The DATABASE decides eligibility: every required lesson of the course completed, and at least 60% of the automatically marked
--   questions right in the learner's latest run of those lessons (multiple choice, tap-the-place, safe-or-scam, matching, finding).
--   Handwriting is never part of this: it is not marked by the app.
-- * The required lesson lists below are copied from the app's curricula (curriculum.js, numeracy.js, digital.js); a test checks they match.
-- * The learner claims the certificate when eligible; only the adult admin can withdraw (revoke) one. Withdrawn ones cannot be re-claimed.

alter table public.adult_courses add column if not exists required_lessons text[];
update public.adult_courses set required_lessons = array['letter-01','letter-02','letter-03','letter-04','letter-05','letter-06','letter-07','letter-08','letter-09','letter-10','letter-11','letter-12','letter-13','letter-14','letter-15','letter-16','letter-17','letter-18','letter-19','letter-20','letter-21','letter-22','letter-23','letter-24','letter-25','letter-26','word-baba','word-uwa','word-ruwa','word-rana','word-gida','word-kaza','word-dawa','word-sama','word-mota','word-waya','my-name','sentence-ina-gida','sentence-ina-son-ruwa','sentence-na-je-gida','sentence-rana-ta-fito','sentence-ka-kira-ni','message-1','message-2','message-3'] where slug = 'basic-literacy' and required_lessons is null;
update public.adult_courses set required_lessons = array['n-digit-0','n-digit-1','n-digit-2','n-digit-3','n-digit-4','n-digit-5','n-digit-6','n-digit-7','n-digit-8','n-digit-9','n-count-10','n-teens','n-tens','n-hundred','n-cmp-small','n-cmp-two','n-cmp-big','n-add-5','n-add-10','n-add-20','n-add-carry','n-sub-5','n-sub-10','n-sub-20','n-sub-borrow','n-times-2','n-times-5','n-times-10','n-times-mix','n-share-2','n-share-5','n-share-mix','n-naira','n-money-add','n-money-sub','n-change','n-money-total','n-money-times','n-money-share','n-measure-kg','n-measure-litre','n-measure-metre','n-profit','n-savings'] where slug = 'basic-numeracy' and required_lessons is null;
update public.adult_courses set required_lessons = array['d-power','d-touch','d-home','d-volume','d-charge','d-call-make','d-call-answer','d-call-end','d-contact','d-text-send','d-text-read','d-text-bank','d-chat-open','d-chat-send','d-chat-voice','d-chat-photo','d-chat-group','d-data','d-browser','d-address','d-search','d-results','d-trust','d-pin','d-scam-prize','d-scam-bank','d-scam-job','d-scam-call','d-report','d-lock'] where slug = 'basic-digital' and required_lessons is null;

create sequence if not exists public.adult_certificate_seq;

create table if not exists public.adult_certificates (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique,
  learner_id     uuid not null references public.adult_profiles(id) on delete cascade,
  course_id      uuid not null references public.adult_courses(id) on delete restrict,
  learner_name   text not null,
  course_title   jsonb not null,
  standard       jsonb not null,
  issued_at      timestamptz not null default now(),
  status         text not null default 'valid' check (status in ('valid','revoked')),
  revoked_at     timestamptz,
  revoked_by     uuid references auth.users(id) on delete set null,
  revoked_reason text check (revoked_reason is null or char_length(revoked_reason) <= 200),
  unique (learner_id, course_id)
);
create index if not exists adult_certificates_learner_idx on public.adult_certificates (learner_id);

alter table public.adult_certificates enable row level security;
drop policy if exists "adult_certificates: own or staff" on public.adult_certificates;
create policy "adult_certificates: own or staff" on public.adult_certificates for select to authenticated
  using (learner_id = auth.uid() or public.staff_can_see_learner(learner_id));
revoke all on public.adult_certificates from anon, authenticated;
grant select on public.adult_certificates to authenticated;

-- internal: how far a learner is. Not callable from the browser.
create or replace function public.adult_calc_standard(p_learner uuid, p_course uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.adult_courses; v_req integer; v_done integer; v_checks integer; v_right integer;
begin
  select * into c from public.adult_courses where id = p_course;
  v_req := coalesce(cardinality(c.required_lessons), 0);
  select count(*) filter (where lp.status = 'completed'),
         coalesce(sum(coalesce((lp.last_results->>'pickTotal')::int, 0) + (case when lp.last_results->>'match' in ('yes','no') then 1 else 0 end) + (case when lp.last_results->>'find' in ('yes','no') then 1 else 0 end)), 0),
         coalesce(sum(coalesce((lp.last_results->>'pickRight')::int, 0) + (case when lp.last_results->>'match' = 'yes' then 1 else 0 end) + (case when lp.last_results->>'find' = 'yes' then 1 else 0 end)), 0)
    into v_done, v_checks, v_right
    from public.adult_lesson_progress lp where lp.learner_id = p_learner and lp.course_id = p_course and lp.lesson_key = any(coalesce(c.required_lessons, '{}'::text[]));
  return jsonb_build_object('required', v_req, 'completed', v_done, 'checks', v_checks, 'right', least(v_right, v_checks),
    'eligible', v_req > 0 and v_done >= v_req and (v_checks = 0 or least(v_right, v_checks)::numeric / v_checks >= 0.6));
end $$;

-- the learner's own view of how far they are, and their certificate if they have one
create or replace function public.adult_certificate_status(p_course uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb; cert public.adult_certificates;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  s := public.adult_calc_standard(auth.uid(), p_course);
  select * into cert from public.adult_certificates where learner_id = auth.uid() and course_id = p_course;
  return s || jsonb_build_object('certificate', case when cert.id is null then null else to_jsonb(cert) end);
end $$;

create or replace function public.adult_claim_certificate(p_course uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare c public.adult_courses; s jsonb; cert public.adult_certificates; p public.adult_profiles;
begin
  if not public.is_adult_learner() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into c from public.adult_courses where id = p_course;
  if c.id is null or c.required_lessons is null then raise exception 'course not available' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.adult_enrollments e where e.learner_id = auth.uid() and e.course_id = c.id) then raise exception 'not enrolled' using errcode = '42501'; end if;
  select * into cert from public.adult_certificates where learner_id = auth.uid() and course_id = c.id;
  if cert.id is not null then
    if cert.status = 'revoked' then raise exception 'certificate withdrawn' using errcode = 'P0001'; end if;
    return to_jsonb(cert);
  end if;
  s := public.adult_calc_standard(auth.uid(), c.id);
  if not (s->>'eligible')::boolean then raise exception 'not yet complete' using errcode = 'P0001'; end if;
  select * into p from public.adult_profiles where id = auth.uid();
  insert into public.adult_certificates (number, learner_id, course_id, learner_name, course_title, standard)
  values ('ASAR-AD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.adult_certificate_seq')::text, 6, '0'), auth.uid(), c.id, p.full_name, c.title, s)
  returning * into cert;
  perform public.adult_log('claim_certificate', auth.uid(), jsonb_build_object('course', c.id, 'number', cert.number));
  return to_jsonb(cert);
end $$;

create or replace function public.adult_admin_revoke_certificate(p_id uuid, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_adult_staff(array['adult_admin']) then raise exception 'not authorized' using errcode = '42501'; end if;
  if char_length(coalesce(p_reason, '')) > 200 then raise exception 'bad reason' using errcode = 'P0001'; end if;
  update public.adult_certificates set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), revoked_reason = nullif(btrim(coalesce(p_reason, '')), '') where id = p_id and status = 'valid';
  if not found then raise exception 'certificate not found' using errcode = 'P0001'; end if;
  perform public.adult_log('revoke_certificate', null, jsonb_build_object('certificate', p_id));
end $$;

do $$
declare f text;
begin
  foreach f in array array['adult_certificate_status(uuid)','adult_claim_certificate(uuid)','adult_admin_revoke_certificate(uuid,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.adult_calc_standard(uuid,uuid) from public, anon, authenticated;
end $$;
