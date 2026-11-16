# ASARTUN ADULT LEARNING — Phase 2 design (for review)

Owner: ASARTUN STORE LIMITED. Status: PROPOSAL. No SQL has been written or run, no existing file has been changed.
Decision taken: adults sign in with **phone number + 6-digit PIN**, accounts created by a facilitator or by the learner.

## 1. Principles
* Adult data lives in its own `adult_*` tables. No foreign key points into the children's `profiles`, `missions`, `entitlements` or `payment_requests`.
* One change to existing code: a lazy route `/adult/*` in `src/main.jsx`. Everything else is new files under `src/adult/`.
* Adult staff are NOT stored in `org_members`. (Correction to my Phase 1 note: reusing it would let school-portal staff reach adult records.) They use a new `adult_staff` table.
* Migrations 017+ only add objects; they never alter or drop existing ones. Prerequisite: 012–016 applied on the target project (please confirm).

## 2. Sign-in (phone + PIN)
* Supabase Auth has no phone+PIN mode without an SMS provider, so the phone number is turned into an internal login name (`<digits>@adult.invalid`, never emailed) and the PIN is the password. Accounts are created already-confirmed by the Edge Function, so email confirmation settings do not matter; the minimum password length must be 6 or lower (Supabase default is 6). *(Corrected in Phase 3: an earlier draft wrongly said email confirmation must be off.)*
* A new Edge Function `adult-admin` (service-role key stays inside the function, never in the browser) offers: `create_learner` (facilitator or adult admin), `self_register` (rate-limited), `reset_pin` (facilitator), `create_staff` (adult admin).
* Learner app uses a third Supabase client with its own storage key (`atb-adult-auth`), the same pattern as the existing two clients.
* **Honest limits:** (a) a 6-digit PIN is weak against guessing; we rely on Supabase's built-in rate limits and facilitator reset, with no extra lockout. (b) Phone numbers are NOT verified (no SMS). Self-registered accounts are marked `phone_verified = false`; facilitator-created accounts are marked verified-by-staff. (c) Photos are private-bucket only, so the PIN protects them; learners should not be told it is "very secure".
* No email/phone shown to other learners. A consent record (`consent_at`, `consent_by`) is stored at registration; assisted registration records the facilitator.

## 3. Tables (all `adult_` prefix, RLS enabled on every one)
| Table | Purpose / key columns |
|---|---|
| `adult_profiles` | id (= auth user), full_name, display_name, phone (unique), phone_verified, language ('ha'), low_data, audio_on, created_by, consent_at, status |
| `adult_staff` | user_id, role ('adult_admin','facilitator'), active |
| `adult_classes` | name, course_id, mode ('physical','online','both'), schedule jsonb, location, status |
| `adult_class_staff` | class_id, user_id |
| `adult_class_members` | class_id, learner_id, joined_at, left_at |
| `adult_courses` | slug, title {ha,en}, kind ('literacy','numeracy','digital'), is_free, price_ngn, access_days (null = no end), prerequisite_course, status |
| `adult_lessons` | course_id, position, title {ha,en}, status |
| `adult_activities` | lesson_id, position, step ('teach','show','practice','write','challenge','review'), type ('trace','write','math_write','draw','photo_task','listen','choice'), content jsonb, audio_key |
| `adult_assessments` | learner_id, taken_by, assisted, items jsonb, scores jsonb, recommended_course, recommended_start |
| `adult_enrollments` | learner_id, course_id, source ('free','payment','staff'), starts_at, ends_at |
| `adult_progress` | learner_id, activity_id, attempts, status ('attempted','completed'), last_at; unique(learner, activity) |
| `adult_skill_checks` | learner_id, skill, level 1–4, checked_by — facilitator confirms the learner can really do it (not just finished lessons) |
| `adult_assignments` | class_id/course_id, lesson_id, title, instructions, due_at, created_by |
| `adult_submissions` | learner_id, assignment_id or activity_id, kind ('handwriting','photo'), strokes jsonb, file_path, attempt_no, status ('submitted','reviewed','redo'), **client_uuid** (unique per learner → no duplicate submissions on retry) |
| `adult_feedback` | submission_id, reviewer_id, score, comment, corrections jsonb (teacher strokes), request_redo |
| `adult_attendance` | class_id, session_date, learner_id, status, marked_by; unique(class, date, learner) |
| `adult_payments` | learner_id, course_id, amount_ngn, method ('manual','online'), reference, status ('pending','verified','rejected'), verified_by (Phase 8) |
| `adult_certificates` | learner_id, course_id, number (unique), issued_by, issued_at (Phase 8) |
| `adult_audit_log` | actor, action, learner_id, at — written by functions only |

Storage: private bucket `adult-submissions`, path `<learner_id>/<submission_id>.<ext>`, JPEG/PNG/WebP only, 2 MB limit (photos are shrunk in the browser first, target ≈300 KB). Handwriting is saved as stroke JSON (a few KB) plus a small PNG for the teacher.

## 4. Permission rules (what RLS must enforce)
Helpers (security definer, `search_path = ''`): `is_adult_staff(role)`, `staff_can_see_learner(learner)` = adult_admin, OR the learner is a current member of a class the facilitator is assigned to.
| Who | Can |
|---|---|
| Learner | read/update own profile (not status/role fields); read own enrollments, progress, feedback; insert own submissions and progress; read published courses/lessons they are enrolled in or that are free; read own storage folder only |
| Facilitator | read learners/submissions/progress/attendance only where `staff_can_see_learner`; write feedback, skill checks, attendance, assignments for their classes; read photos of those learners only |
| Adult admin | manage courses, lessons, classes, staff, payments, certificates; every read is logged |
| Anyone else (incl. children's app users, school-portal staff, anonymous) | nothing |

Learners can never write `adult_payments.status`, `adult_enrollments`, `adult_certificates` or score fields; those change only through functions that check the caller.
Tests to run before Phase 3 is accepted: learner A cannot read learner B; facilitator of class X cannot read class Y; a child's anonymous session reads nothing from `adult_*`; learner cannot approve own payment.

## 5. Navigation
Learner app `/adult` (bottom bar, 4 large buttons, icon + Hausa word; no points, stars or confetti):
**Gida** (home: next lesson, progress) · **Darasi** (courses and lessons) · **Rubuta** (practice writing, my submissions) · **Taimako** (help, audio guide, contact facilitator).
Facilitator `/adult/teach`: Learners · Classes · Review queue · Attendance · Reports. Admin: one new tab "Adult Learning" in `/admin` (courses, classes, staff, payments).
Landing page `/adult` before login: slogan, Sign in, Register, "Register with a facilitator".

## 6. Files that will be created (Phase 3 onward, none exist yet)
`src/adult/AdultApp.jsx`, `adultAuth.js`, `adult.css` (separate, adult styling: plain, large type, no child imagery), `pages/` (Landing, Register, Assessment, Home), `components/HandwritingCanvas.jsx` (Phase 4), `data/adultStrings.js` (ha/en), `supabase/migrations/017_adult_core.sql`, `018_adult_assessment_progress.sql`, `supabase/functions/adult-admin/index.ts`.
Later: 019 submissions + storage (Phase 6), 020 attendance/reports (Phase 7), 021 payments + certificates (Phase 8).

## 7. Phase 3 scope (next)
Landing, registration (self and facilitator-assisted), PIN sign-in, the initial assessment (the 11 skills in the brief, each answerable by tap, audio prompt or finger-writing; facilitator can run it with the learner), recommended starting point, learner dashboard, basic facilitator learner list. Handwriting in Phase 3 is limited to the plain canvas needed by the assessment; guided tracing is Phase 4.

## 8. Not decided / need your input
1. Hausa wording and audio recordings for assessment prompts: who will review and record? Until recordings exist, audio buttons stay hidden (nothing faked).
2. Which Supabase project is the test project, and are 012–016 applied?
3. Pilot courses free? (Phase 8 handles payment; Paystack/Flutterwave keys needed only then.)
4. How long photos and handwriting are kept after a course ends (decided: 2 months after the course ends, then deletion).

## 9. Verification status
This file is a design only. Nothing here has been built, run or tested.
