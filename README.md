# ASARTUN TECH BUILDER  (v0.6 — full version)
A product of ASARTUN STORE LIMITED. Educational web app for children 8–14, Hausa + English.

## What is inside
- **Learner app** — 7 missions (Cassava, Potatoes, Waste, Compost, Solar Energy, Simple Robot, Home Device), each: Learn → Watch → Practice → Challenge → Quiz → Prize. Hausa default, English available. Works offline with built-in missions; with Supabase it shows only what admins published.
- **Admin panel** `/admin` — missions & lesson builder, preview, publish workflow, media library (images, audio, video), learners and results, schools & companies, premium, activity log.
- **School / company portal** `/org` — staff see only their own learners.
- **Voice** — audio buttons appear only when a recording exists (uploaded in admin, or files in `src/assets/audio`).

## Run
    npm install
    npm run dev          # http://localhost:5173
    npm run build        # production build in dist/
    npm run check:missions   # checks Hausa+English and data of all 7 missions
Without Supabase the app runs with the built-in missions (no `.env` needed).

## Connect Supabase (for admin, learners, schools, premium)
1. Create a Supabase project. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public anon key only; **never** the service_role key).
2. Authentication → Providers → **Anonymous sign-ins: enable** (children use private anonymous accounts).
3. SQL Editor — run in this order, once each:
   `001_core_schema` → `002_security_and_functions` → `003_seed_content` → `005_cms_extensions` → `006_learners_orgs_premium` → `008_staff_accounts`
   (`003` already contains all 7 missions on a fresh database. `004` and `007` are only for a database that was seeded earlier: see `docs/PATCH_05_07.md`.)
4. Create your first Super Admin: see `docs/ADMIN_SETUP.md`.
4b. To let admins create school/company staff logins from the panel, deploy the Edge Function once: `docs/STAFF_ACCOUNTS.md`.
5. Deploy on Vercel (`vercel.json` makes `/admin` and `/org` work) and add the two `VITE_` variables there.

## Docs
`docs/ADMIN_SETUP.md` · `docs/CMS_SETUP.md` (content management) · `docs/LEARNERS_ORGS_PREMIUM.md` · `docs/STAFF_ACCOUNTS.md` · `docs/PATCH_05_07.md` · `RECORDING_GUIDE.md` (voice)

## Not built yet
Online payments (Paystack/Flutterwave), learner account recovery, real voice recordings. See the docs for honest limits.
