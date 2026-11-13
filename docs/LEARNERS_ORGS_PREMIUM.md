# Learners, Schools & Companies, Premium
Owner: ASARTUN STORE LIMITED. Needs migrations 001–006.

## Taƙaitawa (Hausa)
- Yanzu ana adana ci gaban kowane yaro a database (da sunan wasa kawai), don haka admin yana ganin **waye yake amfani da app a yanzu**, sakamakon kowa, da **tambayoyin da yara suka fi kasawa**.
- Makaranta ko kamfani na da **lambar shiga** (da lambar kowane aji). Ma’aikatan ta suna ganin **ɗaliban ta kaɗai** a `/org`.
- Darasi na iya zama **⭐ Premium**. Admin yana ba wani yaro ko wata makaranta premium na wasu kwanaki. Biyan kuɗi ta yanar gizo (Paystack/Flutterwave) ba a haɗa ba tukuna.

## 1. Who is using the app (Admin → Learners)
- Children get a private **anonymous** account on their device (no email, no password). Their nickname and optional age band (5–7, 8–10, 11–13, 14–17) are stored. **No real name, phone, email or photo.**
- The app pings the database every 2 minutes while open, so Admin sees: online now (5 min), active today, active 7 days, new today, total, premium learners.
- Learner list: search, filter by school/company, points, missions finished, last active, CSV download.
- Click a learner: parts finished per mission (Learn / Watch / Practice / Challenge / Quiz / Finished), where they stopped, questions answered wrongly, badges, groups.
- **Where learners struggle:** funnel per mission + hardest quiz questions (wrong attempts). Use it to fix unclear lessons or explanations.
- Who can look: `learning_analyst` and `super_admin`. **Every look at a child’s record is written to the activity log** (Super Admin can read the log; learners and organizations cannot).
- Progress already earned on a device is sent once, automatically, the first time the updated app opens online. Wrong-answer tracking starts from this release.

## 2. Schools and companies (Admin → Schools & companies, and /org portal)
1. Super Admin: **+ New organization**. The organization must confirm in writing that it has parent/guardian permission; tick the box and write the contract reference. **Until it is ticked, children cannot join.**
2. Super Admin: **Staff** tab. First create the person in Supabase → Authentication → Users (email + password), then enter that email here (role: Teacher = view, Organization admin = view + classes + code). They sign in at `/org/login`.
3. Classes: each class has a code. The organization has its own code too. Children type a code on the first screen or in Settings. Codes are 8 characters; 10 tries per hour per child; a code can be replaced any time.
4. Staff see **only their own organization’s learners**: game name, age band, class, points, missions finished, last active, per-learner results, the struggle report, CSV download. They can set **their own student reference** (e.g. “JSS1-014”) so they know who is who without ASARTUN holding real names.
5. Children see in Settings which organization can see their results, and can **Leave**. “Delete my online record” erases everything online.
6. Suspended organization = codes stop working and staff lose access immediately. Maximum learners can be set.

## 3. Premium
- Mission → Details → **Who can open this mission? → ⭐ Premium**.
- Admin gives premium to a **learner** (Learners → click → Give premium) or a whole **organization** (Organizations → Premium), for a number of days. Admin → **Premium** lists and ends them.
- **Enforced by the database**, not only by the app: lesson steps, questions and media of a premium mission are unreadable without an active entitlement. Free learners see the card as “⭐ Premium”.
- **Payments are not connected.** Online payment (Paystack / Flutterwave) needs a server function with secret keys and a payment webhook that writes a row in `entitlements` (`source = 'payment'`). The table is ready for it; until then you grant premium by hand after payment. Tell me when you want this built.

## Setup
1. Supabase → Authentication → Providers → **Anonymous sign-ins: enable**. Keep Supabase’s sign-in rate limits on.
2. Run `supabase/migrations/006_learners_orgs_premium.sql` (after 001–005). Safe to run twice.
3. Give your analysts the `learning_analyst` role (Super Admin has everything).
4. `npm install` (no new packages) and `npm run dev`. Admin: `/admin`. Portal: `/org`.
No new environment variables. The `service_role` key is never used.

## Privacy and the law (please read)
- Children’s data is sensitive. Under Nigeria’s data protection law (NDPA 2023) you need a lawful basis, a clear privacy notice and, for children, parent/guardian consent. This system **records** the organization’s confirmation and shows the child who can see their results, but it does **not replace legal advice**. Have a lawyer review your privacy notice and your contract with each school/company before launch.
- Keep collecting as little as possible: nickname + age band only. Do not add names, phone numbers or photos.
- Organization staff can see a learner’s progress in all missions, not only those done at school.

## Limits
- The learner identity lives in the browser: if a child clears the browser data or changes phone, they start as a new learner (their old record stays until deleted). There is no recovery code yet.
- “Online now” is approximate (2-minute ping).
- Child-side points shown on screen are kept on the device; the database decides official points (`award_progress`). Rewards the database refuses are dropped.
- Duplicating a mission makes it Free; set Premium again.
- Not run here (no internet): please test: run 006; start the app; open `/admin/learners`; create an organization (tick consent), add a class, join from the app with the class code; confirm the organization portal shows only that child; mark a mission Premium and check a free learner sees it locked, then give premium and check it opens.
