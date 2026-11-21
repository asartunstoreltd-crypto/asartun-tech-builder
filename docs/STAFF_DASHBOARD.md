# Unified dashboard, staff management and PWA — deployment notes

Nothing here has been applied to any Supabase project or hosting account. Do these steps yourself, in this order.

## 1. Database (TEST project first)
1. Back up the database.
2. Confirm migrations 017–026 are applied (the adult-learning core). 027 depends on them.
3. Run `supabase/migrations/027_staff_management.sql` in the SQL editor (additive and re-runnable: new columns, indexes, one trigger, eight functions; no table or policy is dropped or changed).
4. Run `supabase/tests/027_staff_management.test.sql` in the same TEST project. It rolls back and prints `ALL 027 CHECKS PASSED`. (It was written but could not be executed where it was authored.)
5. Repeat on production.

## 2. Edge Function
The “Add teacher” button uses the **existing** `adult-admin` function (`create_staff`). It is unchanged. It must be deployed:
`supabase functions deploy adult-admin` (its secrets — the service-role key — are provided by Supabase; nothing goes in the browser).
Until it is deployed the button shows a clear “service not deployed” message and the rest of Staff works.

## 3. Roles (separate grants — never merged)
* `/admin` access = a row in `admin_roles`. `/dashboard` adult sections = a row in `adult_staff` (active).
* A Super Admin who also needs adult administration must be given an `adult_staff` row explicitly:
  `insert into public.adult_staff (user_id, role) values ('<auth user id>', 'adult_admin');`
* Super Admin alone does NOT open Staff, Learners, Classes, Payments, etc. (and the database refuses it too).

## 4. Build and deploy
```
npm install
npm run build
npm run test:adult && npm run test:dashboard && npm run test:pwa
```
Deploy `dist/` to your host (`vercel.json` for Vercel, `public/_headers` for Netlify; both carry the same rules). The service worker only works over HTTPS in a production build.

## 5. Check by hand after deploying
* Sign in at `/dashboard` as: super admin only, adult admin, teacher, suspended teacher. Confirm the menu and that typing another section’s address shows “No access”.
* Old links: `/admin`, `/admin/missions/<id>`, `/adult/teach` land inside `/dashboard`.
* Children’s-app sections inside the dashboard (mission editor preview, media library): the dashboard now has the strict CSP that `/adult` has; confirm nothing external was relied on.
* Install on Android Chrome and desktop Chrome; publish a small change and confirm the “new version is ready” banner appears.
* Sign out, sign in as someone else on the same browser: no earlier data is shown.
* Lighthouse “Installable” and PWA audit; real offline test (airplane mode shows the offline page, not stale data).

## What the service worker keeps
Only public static files: the built `/assets/*` (js, css, fonts, images), the offline page and the app icons. It never touches Supabase, signed file URLs, requests with an Authorization header, non-GET requests, or HTML pages. The app is **not** usable offline; the one exception that predates this work is the adult lesson queue (`adult-pending-progress`), now tagged per learner.

## Rolling back
`/dashboard` is additive. To restore the old screens, point `/admin/*` in `src/main.jsx` back to `AdminApp` and `teach/*` in `src/adult/AdultApp.jsx` back to `Teach` (the files are still in the repo), and revert the five `/dashboard/...` links in `src/admin/*.jsx`. To remove the PWA, delete `public/sw.js`, publish once more, and users’ service workers unregister on the next visit only if you ship a worker that calls `registration.unregister()` — plan this before removing it.
