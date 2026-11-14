# Creating school / company staff accounts from the admin panel
Owner: ASARTUN STORE LIMITED. Needs migrations 001–008 and ONE Edge Function (below).

## Taƙaitawa (Hausa)
Admin yana ƙirƙirar asusun ma’aikacin makaranta ko kamfani kai tsaye a **Admin → Staff accounts** (ko a Dashboard → “+ Create staff account”). Ana ba da imel da kalmar sirri mai ƙarfi sau ɗaya, tare da saƙon da za a tura ta WhatsApp. Ma’aikaci yana shiga a `/org/login` yana ganin ɗaliban makarantarsa kaɗai, kuma yana iya canza kalmar sirrinsa. Dole a saka “staff-admin” function a Supabase sau ɗaya (matakai a ƙasa).

## How it works
1. Super Admin: **Staff accounts** (menu) → choose the school/company → email → role → **Create account**.
   (Also inside **Schools & companies → the organization → Staff**, and from the Dashboard card.)
2. A login is created with a strong password. It is shown **once** with a ready message (Hausa + English) to copy and send privately.
3. The staff member opens `/org/login`, signs in, and should press **Change password**.
4. In the staff list you can **Reset password** (new password shown once) or **Remove access**.
5. Roles: **Teacher** = view learners and results. **Organization admin** = also classes and the organization code.
6. If the email already has a login, it is simply linked to the organization (its password is not changed).
Every create / add / reset is written to the **Activity log** (Super Admin only).

## Why an Edge Function?
Creating a login needs the Supabase **service_role** key. That key can do anything, so it must **never** be in the website. The Edge Function runs on Supabase’s server, checks that the caller is a **Super Admin**, and only then creates the account. Supabase gives the function the key automatically: you do not copy or paste any secret.

## One-time setup
1. SQL Editor: run `supabase/migrations/008_staff_accounts.sql`.
2. Deploy the function (choose ONE way):
   **A. In the Supabase website (easiest)**
   - Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
   - Name: `staff-admin` (exactly).
   - Open `supabase/functions/staff-admin/index.ts` from this project, copy everything, paste it into the editor.
   - Keep **Verify JWT** switched **on**. Click **Deploy**.
   **B. With the command line**
   ```
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase functions deploy staff-admin
   ```
3. Nothing to add in `.env`. No new npm packages.
4. Test: sign in as Super Admin → Staff accounts → create an account for a test organization → copy the message → open `/org/login` in a private window → sign in.
If the button says “The staff service is not set up yet”, the function is not deployed under the name `staff-admin`.

## Security
- Only a Super Admin can call it (checked on the server from their own sign-in, not from the browser).
- It never resets passwords of ASARTUN admins or of accounts that are not school/company staff.
- Passwords are 14 random characters (no look-alike letters) or your own (10+). Shown once, never stored in the app.
- Removing access keeps the login but it sees nothing. Suspending an organization stops staff access to learners at once.

## Limits
- No email is sent automatically (no email service is needed): you send the credentials yourself. A “forgot password” email link for staff is not built; ask a Super Admin to reset it.
- I could not deploy or run the function here (no internet). It was checked for syntax only. Please test it as described above.
