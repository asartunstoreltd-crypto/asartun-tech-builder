# ASARTUN ADULT LEARNING — Phase 9: security review, phone checks, regression tests, purge schedule (v0_10_0)

Status: reviewed and checked by script. **Nothing has been run against a real database, a real Supabase Auth, a browser or a phone.** Read "What this review could NOT do" first.

## 1. Security findings and what was done

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **High** | `adult-admin` → `reset_pin`: `staff_can_see_learner()` is true for the adult admin for *any* id, and the login system is shared with the children's app and with staff. An adult admin (or anyone who took over that account) could reset the password of **any** account, including the children's-app admin. | **Fixed**: the target must be a row in `adult_profiles`, the id format is checked first, and a test locks this in. |
| 2 | Medium | 6-digit PINs can be guessed by trying many PINs for a known phone number. Supabase's own rate limits are per address, not per account. | **Written, not active**: migration 025 locks a learner for 15 minutes after 5 wrong PINs in 15 minutes (even the right PIN is refused during the lock; a facilitator's PIN reset clears it; staff and the children's app are never affected). It works through Supabase Auth's *Password Verification* hook, a **Pro-plan** feature that you must switch on in the dashboard. Never tested against real Supabase Auth. Without it, this risk remains (see §5). |
| 3 | Medium | No browser security headers. | **Fixed for `/adult` only** (`vercel.json` and `public/_headers`): strict Content-Security-Policy (own scripts only, no eval, no inline scripts, no framing, no plugins, Supabase allowed for data and photos), nosniff, no framing, referrer and permissions policies. The children's routes get **no** new headers (so they cannot break). |
| 4 | Low | Old sign-up / activation-code / wrong-PIN attempt records were never deleted. | **Fixed**: `adult_cleanup_attempts()` (server only) is run by the purge job; the job also leaves a `purge` line in the audit log. |
| 5 | Low | Purge job could not be called by a scheduler (login check) and was not scheduled. | **Prepared**: `supabase/schedule/adult_purge_schedule.sql` (see §4). |
| 6 | Low | Three inputs had only a placeholder, so a screen reader had no name for them. | **Fixed** (aria-label). |
| 7 | Info | A column-level `UPDATE` right exists for browsers (4 preference columns on the learner's own profile row). | **Reviewed, kept, now pinned by a test**: own row only, no phone/name/status columns, name length limited. |

Reviewed and found sound (by reading and by tests): every table has RLS; no right is ever granted to anonymous visitors; the browser role has no write right except finding 7; every function is `security definer` with an empty search path; exactly 7 functions are not callable by a browser (internal, server or Auth only); the only place a login is deleted is "delete my account"; no service key or payment secret exists in browser code; the Edge Functions never log; the purge removes files before rows and stops if a file cannot be removed; learners cannot set a price, access date or payment status; facilitators cannot read payments or other classes' attendance.

## 2. Phone and accessibility review (from the style sheet and the code)
Fixed: unstyled text areas (payment instructions), `100vh` (now `100dvh`, so the page fits with the phone's address bar), long Hausa words could overflow (now wrap), language buttons 44→48px, text-links 48px tall, one visible focus ring for every button, three unlabeled inputs.
Checked by test: touch targets (buttons 56px, tabs 56px, inputs 56px, other controls ≥48px), base text 20px and nothing under about 17px, no fixed width wider than a small phone, bottom tabs clear the gesture bar, all motion switched off for people who asked for less motion, pinch-zoom not disabled, every picture has alt text, every input has a label, print and dark mode exist. **None of this was seen on a real phone.**

## 3. Whole-module regression suite (new, in `scripts/test-adult.mjs`: 8,971 checks)
- Every database call in the app (40) is checked against the real SQL: the function exists, is callable by signed-in users, and the app sends exactly the parameters it expects. Every table read (17) is checked: table, column and read right exist.
- Every link points at a real page; every import resolves and the named export exists; Hausa and English use the same `{placeholders}` in all 900+ strings.
- **The children's app, `/admin` and `/org` are fingerprinted** (`scripts/baseline-v0_9_7.json`, 143 files). The suite fails if any of them changes or a stray file appears outside the adult module. (Regenerate the file only on purpose.)
- Whole-database audit across migrations 017–025, Edge Function checks, header checks, secret scan, phone checks (listed above).
- Mutation checks: **42 new breaks for this phase (first run missed 3; the tests were tightened; all caught)**; the 38 (Phase 8) and 34 (Phase 7) are still all caught: 114 in total.
- All six `scripts/test-*.mjs` pass; `tsc --noResolve`: no syntax or undefined-name errors.

## 4. Scheduling the purge job (needs you; never run)
`supabase/schedule/adult_purge_schedule.sql` is **not** a migration (so it cannot run by accident). Steps: (1) `supabase functions deploy adult-purge --no-verify-jwt`; (2) `supabase secrets set PURGE_SECRET=<24+ random characters>`; (3) enable `pg_cron` and `pg_net` in Supabase; (4) fill in `<PROJECT_REF>` and `<SAME_PURGE_SECRET>` in the file and run it once in the SQL editor. It then runs daily at 03:00 UTC (04:00 in Nigeria); the secret lives in Vault. Check with `select * from public.adult_audit_log where action = 'purge' order by at desc;` and `cron.job_run_details`. What it deletes: photos and handwriting of classes closed more than 2 months ago, then old attempt records. **It does not delete attendance or payment records** (see §6).

## 5. What this review could NOT do — and remaining risks
- **No real database, Auth, browser or phone was used.** Migrations 017–025 have never been executed by me; a script can read SQL but not prove it runs or that RLS behaves. Please do the manual checklist below.
- No penetration test, no load test, no external security audit. This is a careful review, not a certification.
- **PIN guessing** stays possible until the lock (finding 2) is switched on (Pro plan), or you add a CAPTCHA on sign-in (not built). 6-digit PINs are a decided trade-off for adults who cannot use passwords.
- **Phone numbers are not verified** (decision): anyone can register a number that is not theirs, which can block the real owner until staff create/reset the account. Registration also reveals whether a number is already registered (and the lock message reveals a registered learner).
- Self-registration is limited to 5 per address per hour and 300 per day for everyone; an attacker could use up the day's allowance (denial of sign-up). Staff-assisted registration is unaffected.
- The CSP keeps `style-src 'unsafe-inline'` (React inline styles). If you use a custom Supabase domain, add it to the policy. Only `/adult` has the headers.
- Payment instructions and account details are visible to every signed-in learner (by design). Facilitators see learners' phone numbers.
- Data protection: the module stores names, phone numbers, handwriting and photos of adults. Nigeria's data-protection law (NDPA 2023) may require a privacy notice, consent wording, a retention rule and a data-controller contact. **I am not a lawyer: please have this checked.**

## 6. Decisions still open
Attendance and payment retention (kept forever today); price and duration of the digital course; refund/revoke rules; native-speaker review of the Hausa; whether to require literacy before the digital course; whether to turn on the wrong-PIN lock (Pro plan).

## 7. Manual acceptance checklist (real accounts; about 30 minutes)
Make: Learner A and B (different classes), Facilitator F1 (class of A), Facilitator F2 (class of B), Adult admin.
1. Run migrations 017–025 in order; no errors. 2. Sign in as A on an Android phone; do a lesson, a tracing, a photo submission. 3. As A, try to open B's data (change an id in the address bar): nothing shown. 4. As F1: sees A, not B; cannot open B's learner file, attendance or photos. 5. As F1: payments tab not visible; call `adult_admin_payments` from the browser console: refused. 6. As A: request a payment for the digital course; as admin: accept it; A can start; set the end date in the past: A is refused lessons. 7. Make an activation code; use it as A (works once); use it again as B (refused). 8. Try 11 wrong codes in an hour: blocked. 9. Finish a course as A; claim the certificate; open it as F1 (allowed) and as B (not found). 10. Reset A's PIN as F1: works; as F1 try the reset on the admin's id (call the function with the admin's id): refused. 11. If the lock is on: 5 wrong PINs for A → locked 15 minutes, a reset clears it, and an F1 sign-in is never locked. 12. Print a class report and a certificate from the phone. 13. Open `/adult` and check the browser console for any "Refused to load… Content Security Policy" message; open `/` and `/admin` and confirm they behave as before. 14. Run the purge job manually (curl with the secret header) on a class closed >2 months ago in a test project; files and rows disappear; one `purge` line appears in the audit log.

## 8. Files
New: migration `025_adult_security.sql`; `supabase/schedule/adult_purge_schedule.sql`; `public/_headers`; `scripts/baseline-v0_9_7.json`; this doc.
Modified: `supabase/functions/adult-admin/index.ts`, `supabase/functions/adult-purge/index.ts`, `vercel.json` (headers for `/adult` only; the rewrite is unchanged), `src/adult/adult.css`, `src/adult/pages/Teach.jsx`, `scripts/test-adult.mjs`.
Children's app, `/admin`, `/org`, `src/main.jsx`: untouched (proved by the fingerprint test). `vercel.json` and `public/_headers` are deployment files outside the adult module; they affect only `/adult` paths.
