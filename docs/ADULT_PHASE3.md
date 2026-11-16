# ASARTUN ADULT LEARNING — Phase 3 report
Registration, phone + PIN sign-in, initial assessment, learner dashboard, basic facilitator area.
**Status: written and statically checked. NOT yet run against a database, deployed, built with Vite, or tried on a phone.**

## 1. Setup (test project first)
1. Apply `017_adult_core.sql` then `018_adult_assessment.sql` in the Supabase SQL editor (012–016 must already be applied).
2. Auth settings: no change is required (accounts are created with the confirmed flag by the Edge Function). Minimum password length must be 6 or lower (the Supabase default is 6).
3. Create a login for the adult admin (Authentication → Users), put its email in `supabase/bootstrap_first_adult_admin.sql`, run it.
4. Deploy `supabase/functions/adult-admin` and set its secret `ADULT_LOGIN_DOMAIN` (default `adult.asartun.invalid`). If Supabase refuses that domain when creating a user, use a domain you own, and set the SAME value in `VITE_ADULT_LOGIN_DOMAIN`. This has not been tested.
5. Sign in at `/adult/teach`, create a class and a facilitator ("Staff" tab), then register learners.

## 2. What exists
* Learner (`/adult`): landing, self-registration, phone + PIN sign-in, 12-item assessment (tap, write-then-compare, rate), result with advisory start point, dashboard (Gida), lessons list with free enrolment (Darasi), free writing practice that is never sent (Rubuta), help with language / sound / data settings and account deletion (Taimako).
* Facilitator (`/adult/teach`): learner list and search, assisted registration (PIN shown once), PIN reset, run the assessment with a learner, learner file (every open is logged), classes, add learner by phone, assign facilitator (admin), create staff (admin).
* Handwriting canvas (`HandwritingCanvas.jsx`): finger/stylus/mouse, pencil, eraser, undo, redo, clear (undoable), optional faint guide, stroke vectors + PNG export. Tracing guides and submission storage come in Phase 4 and 6.

## 3. Files
Created: `src/adult/**` (13 files), `supabase/migrations/017_adult_core.sql`, `018_adult_assessment.sql`, `supabase/functions/adult-admin/index.ts`, `supabase/bootstrap_first_adult_admin.sql`, `scripts/test-adult.mjs`, this file, `docs/ADULT_PHASE2_DESIGN.md`.
Modified (existing): `src/main.jsx` (one lazy route `/adult/*`), `package.json` (script `test:adult`), `.env.example` (one optional variable). Nothing else.

## 4. Database changes
17 new `adult_*` tables, all with RLS; browser roles can only SELECT (plus update four comfort settings on their own profile); all writes go through `security definer` functions or the Edge Function. No existing table, function or policy is altered. Seed: three courses (literacy, numeracy published and free; digital "coming soon").

## 5. Tests actually run
`npm run test:adult` → 766 checks pass: phone/PIN rules (and that the Edge Function repeats them), assessment scoring and recommendations (including "nothing assessed gives no level, not zero"), Hausa/English key parity and use, SQL structure (RLS on every table, empty search_path, no destructive statements, SELECT-only grants). One test was added after I found and fixed a real policy bug in my own SQL. Existing `scripts/test-*.mjs` still pass. All JSX/TS files parse and have no undefined names (TypeScript check).

## 6. NOT verified — please do not assume these work
* The SQL has never been executed (no Postgres here). Expect to fix small errors on first run.
* The Edge Function has never been deployed or called; whether Supabase accepts the `.invalid` login domain is unknown.
* `npm install` / `vite build` / the app in a browser: not possible in my sandbox. The canvas is untested on real Android phones, tablets and styluses.
* Existing children's features: only `main.jsx` changed and the old test scripts pass, but I have not opened the children's app. Please confirm after building.
* Row-level security was checked structurally, not by signing in as different users. Do the four checks listed in the Phase 2 doc (§4) on the test project before real learners.

## 7. Known limits and decisions
* Hausa text is a DRAFT for a native speaker to correct. No audio recordings exist, so audio buttons are hidden and the assessment shows a notice suggesting a facilitator. Name recordings `adult.<item id>` (for example `adult.l1_recognize.mp3`) in `src/assets/audio/ha/`.
* Handwriting is never auto-recognised. The learner writes, sees the correct answer, and a person (learner or facilitator) says whether it matched. Self-entered results are flagged "needs confirmation".
* 6-digit PIN: weak against guessing; only Supabase rate limits protect it. Phone numbers are not verified (flagged on self-registered accounts).
* A self-registered learner is in no class, so no facilitator can see them until one adds them by phone number.
* The facilitator screen uses the same browser sign-in as `/admin` and `/org`; signing in there replaces an admin session in the same browser.
* "Save mobile data" is stored but has no effect yet (nothing heavy exists until photos in Phase 6).
* Retention decided: photos and handwriting are deleted 2 months after a course ends. Nothing is stored yet, so nothing is enforced; the deletion job is built with submissions in Phase 6.
* Facilitators see their learners' phone numbers (needed to contact them).
