# ASARTUN TECH BUILDER — Admin foundation setup (Phase 1)
Owner: ASARTUN STORE LIMITED

## What Phase 1 adds
| Path | Purpose |
|---|---|
| `supabase/migrations/001_core_schema.sql` | All tables, UUID keys, foreign keys, indexes, `updated_at` triggers |
| `supabase/migrations/002_security_and_functions.sql` | Roles, RLS policies, publish rules (Hausa + English), reward function, reports, storage bucket |
| `supabase/migrations/004_refresh_mission_content.sql` | Only if you already ran 003 earlier: replaces Mission 03 lesson content with the extended version (biogas, plastic recycling) |
| `supabase/migrations/003_seed_content.sql` | Cassava, Potato, Waste missions + badges + branding settings, generated from the existing `src/data/*.js` |
| `supabase/bootstrap_first_super_admin.sql` | One-time script to create the first Super Admin |
| `scripts/generate-seed.mjs` | Regenerates 003 from the static mission files (`npm run seed:generate`) |
| `src/lib/supabase.js` | Two Supabase clients (learner / admin) with separate sessions |
| `src/main.jsx` | Router: `/admin/*` → admin (code-split), everything else → unchanged learner app |
| `src/admin/*` | Login, route guard, layout, dashboard, styles |
| `public/_redirects` | SPA fallback so `/admin/login` works on Netlify-style hosts |

The learner app (`App.jsx`, `MissionEngine`, games, localStorage progress) is **not modified** in this phase.

## 1. Environment variables
Copy `.env.example` to `.env.local`:
- `VITE_SUPABASE_URL` — Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — Project Settings → API → `anon` `public` key (safe for the browser *because* RLS protects the data)

**Never** put the `service_role` key in the frontend or in any `VITE_*` variable. This project does not need it.

## 2. Supabase setup
1. Create a Supabase project.
2. SQL Editor → run `001_core_schema.sql`, then `002_security_and_functions.sql`, then `003_seed_content.sql` (in that order).
   The seed publishes each mission through the same translation check the admin panel uses, so a failure here means a real content gap.
3. Authentication → Sign In / Providers → enable **Anonymous sign-ins** (used for children in Phase 2; no email or password for kids).
4. Authentication → Providers → Email: keep enabled; turn on **Confirm email** for real admins.
   Nobody gets admin rights from signing up: access needs a row in `admin_roles`, which only a Super Admin (or you, in the SQL Editor) can create.
5. Authentication → URL Configuration: add your site URL and `http://localhost:5173`.

## 3. Create the first Super Admin (securely)
1. Authentication → Users → *Add user* → *Create new user*: real private email, long unique password, tick *Auto Confirm User*.
2. Edit `supabase/bootstrap_first_super_admin.sql`, put that email in, run it in the SQL Editor.
   The SQL Editor runs as the project owner, so it is the only place the first admin can be created. The app can never self-promote anyone.
3. Open `/admin/login` and sign in. Use a unique password and enable MFA for this account in Supabase when available on your plan.

## 4. Run
```
npm install
npm run dev        # http://localhost:5173  (learners)  and  /admin/login
npm run build
```
Hosting: single-page-app rewrite of `/*` → `/index.html` is required (included for Netlify as `public/_redirects`; on Vercel add a rewrite).

## 5. Verify security yourself (do this before real use)
With only the public anon key (replace the values), these must all return `[]` or an error, never data:
```
curl "$URL/rest/v1/admin_roles?select=*"          -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl "$URL/rest/v1/profiles?select=*"             -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl "$URL/rest/v1/user_progress?select=*"        -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl "$URL/rest/v1/admin_activity_logs?select=*"  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl "$URL/rest/v1/missions?select=slug,status"   -H "apikey: $ANON" -H "Authorization: Bearer $ANON"   # only published / coming_soon rows
curl -X POST "$URL/rest/v1/rpc/admin_dashboard_stats" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"   # permission error
```
Also test: sign in as a normal (non-admin) Supabase user and open `/admin/dashboard` → "No access"; a direct `PATCH /rest/v1/profiles` to raise points → rejected.

## 6. What is and is NOT secure yet
Implemented in the database (RLS / functions): admin roles, content writes limited to Content Managers, Super-Admin-only role and settings management, learners read only their own rows, points and badges writable only through `award_progress()`, no children's contact data stored, audit log written by triggers, Hausa + English completeness enforced before publish.

Known limits of Phase 1:
- `award_progress()` stops arbitrary points and repeat claims, but a determined learner could still claim a *valid* event early (e.g. `finish`) without playing. Server-side sequencing is a later hardening step.
- The learner app does not call Supabase yet, so today's points are still stored on the device. Phase 2 connects it.
- Parent/guardian linking has the table and policies only; the request/approve functions come with the learners module.
- Not yet run against a live Supabase project in this environment (see "Testing status" in the hand-over message).
- Seed defaults to review: category names (Hausa wording needs a native-speaker check), age range 6–12, difficulty `beginner`.
