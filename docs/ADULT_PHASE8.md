# ASARTUN ADULT LEARNING — Phase 8: digital literacy course, paid courses, certificates (v0_9_9)

Status: built and checked by script only. **Never run against a database, in a browser or on a phone.** Hausa text is a DRAFT. Online payment is **NOT connected**.

## Decisions followed (from the owner)
- Payments: **manual now** (bank transfer / cash / agent, then admin approval, or an activation code); **online (Paystack / Flutterwave) later**. The adult admin chooses which courses are free or premium.
- The digital literacy course is **paid**. **The price and duration have not been given yet**: nothing is hard-coded. The course row starts as free / "coming soon"; nobody can buy it until the adult admin opens Teach → Courses, makes it Premium, enters a price (and optionally access days) and sets it to Published.
- Certificates: **no public check page**. Only the owner and staff can read one.

## 8A — Digital literacy course (`src/adult/digital.js`)
30 lessons, 7 units: the phone, calls, text messages, chat apps (WhatsApp-style), the internet, searching, online safety and scams. Each lesson = one spoken teaching page (the phone's own voice, only if it has one for that language) + 2–4 questions + review. All text is in this one file for review.
- New question types, **all marked automatically**: *tap the right place* on a drawn phone screen (13 generic screens, no real app logos or screenshots), *multiple choice*, and *safe or scam?* message cards with a short "why". Nothing is typed and no handwriting is involved.
- Progress is saved with the existing function (`pickRight` / `pickTotal`), so no database change was needed for lessons.
- Scam examples never name a real bank or app (a test enforces this). Content teaches: never share PIN/OTP/BVN, prize/fee scams, fake bank links, "wrong transfer" requests, job/loan advance-fee scams, scam calls, what to do if scammed, locking the phone.
- Reports (Phase 7) now have two more skill areas: **phone and internet skills** and **online safety and spotting scams** (separate pools). New support rule `safetyLow`: ≥4 safety questions and <60% right = keep an eye; <40% = serious. Learner "My progress" shows the new units.
- The `prerequisite_course` (literacy) already on the course row is **not enforced** anywhere; I left literacy as a recommendation, not a lock.

## 8B — Payments (migration 023)
- **Admin controls** (`adult_admin_set_course`): status, free/premium, price (₦1–10,000,000), access days (1–3650 or none). Premium requires a price; free forces price 0 and no end date. Learners who joined a course free before it became premium **keep access** (their enrolment has no end date).
- **How to pay** (`adult_payment_info`): instructions in Hausa and English, account details, WhatsApp number — written by the adult admin, shown to learners.
- **"I have paid"** (`adult_request_payment`): learner enters a reference (3–60 letters/numbers); the price and duration are copied from the course by the database (the learner cannot set them); one waiting request per course, at most 3 waiting; people with permanent access are refused. The adult admin sees phone, course, amount, reference, then **Accept** (reminder: only after the money has really arrived) or **Reject** (optional reason). Learner can cancel a waiting request and sees status/history.
- **Access** is granted only by the database (`adult_grant_access`, callable by nobody directly): new enrolment with `ends_at = now + access days`, or an extension added after any access still running; permanent access is never shortened. Lessons are already refused after `ends_at` (`adult_record_lesson`).
- **Activation codes** (for cash/agents): the adult admin creates 1–100 at a time (12 random characters, valid 1–365 days, with an agent note). Shown **once**; only a hash is stored. A learner can try 10 codes an hour. A used code is locked to the learner.
- **Payment history** for learners (own) and for the adult admin (all). Facilitators never see payments.
- **Online payment**: the columns `method = 'online'`, `provider`, `provider_ref` exist, but no function writes them. To add it later I need: your Paystack or Flutterwave account, the secret key stored **only** as a server secret in an Edge Function, a webhook URL, and the decision on refunds. Until then nothing online works and nothing pretends to.
- The browser never holds a secret or payment key. The payment screen tells people never to type a PIN or card number and has no such field.

## 8C — Certificates (migration 024)
- Says **"ASARTUN Certificate of Course Completion"**, offered by ASARTUN ADULT LEARNING (ASARTUN STORE LIMITED), with a unique number (`ASAR-AD-2026-000001`), the name and course saved at issue, and the line *"not a government-accredited or examination-board qualification"* in both languages. A test rejects any other certificate wording that suggests accreditation.
- **Eligibility is decided by the database**: every required lesson of the course completed **and** at least 60% of the automatically marked questions right in the latest run of those lessons. Handwriting plays no part. Required lesson lists are stored per course and a test checks they equal the app's courses.
- The learner claims it when eligible (progress and requirements are shown under the lesson list). The adult admin can withdraw one (it then cannot be re-claimed). A learner needs an enrolment (even an expired one: completion is earned). Printing uses the browser's print.
- No public check page, no anonymous access.

## Screens
Learner: Courses (price, premium badge, how to join, access end date), course page shows the payment panel when there is no active access, payment history, certificate box, certificate page. Adult admin (Teach): **Courses**, **Payments** (waiting requests, how-to-pay editor, codes, history). All staff: **Certificates** (a facilitator sees only learners of their classes).

## Files
New: migrations `023_adult_payments.sql`, `024_adult_certificates.sql`; `src/adult/digital.js`, `components/DigitalSteps.jsx`, `pages/Pay.jsx`, `pages/Certificate.jsx`, `pages/TeachAdmin.jsx`; this doc.
Modified (adult module only): `Lessons.jsx`, `Learner.jsx`, `Teach.jsx`, `courses.js`, `AdultApp.jsx`, `adultApi.js`, `strings.js`, `reports.js`, `TeachReports.jsx`, `Progress.jsx`, `adult.css`, `scripts/test-adult.mjs`. Children's app, `/admin`, `/org`, `src/main.jsx`: untouched (diff against v0_9_7).

## Verification
- `node scripts/test-adult.mjs`: **6,977 checks pass** (about 2,700 new this phase; Phase 7: 4,256). All six `scripts/test-*.mjs` pass. `tsc --noResolve` on the adult JS/JSX: no syntax or undefined-name errors.
- Mutation checks: **38 breaks for Phase 8** (permanent access shortened, renewal losing time, anyone accepting a payment, premium course requested as free, unlimited code guessing, facilitators reading payments, browser insert rights, amount not taken from the course, certificate threshold lowered, certificate without enrolment, certificates readable by all/anonymous, certificate claiming accreditation, lessons opening without access, join button for premium, password field in payment form, public certificate route, etc.). First run missed 1 (a prefix match on the code-count limit); test fixed; **all 38 caught**. The 34 Phase 7 breaks are still all caught.
- **Not done:** migrations 022–024 never executed (no Postgres here, so SQL mistakes are possible); no `vite build`; no browser or phone run; the drawn phone screens were never seen (text wrapping inside small buttons may need adjusting); nothing about money was tested with real money; Hausa unreviewed.

## To deploy and try
1. Run `023_adult_payments.sql`, then `024_adult_certificates.sql` (after 017–022). 2. Deploy the app. 3. As adult admin: Teach → Courses → set the digital course Premium with your price/days and Published; Payments → fill in "how to pay"; create a test code. 4. As a learner: open the course → try "I have paid" (admin accepts) and a code; do a lesson with taps and scam cards. 5. Finish a course and claim a certificate (to test quickly, use a test learner and the literacy course). Please report SQL errors, how the phone-screen pictures look on a small Android, and anything confusing in the payment flow.

## Decisions / open questions
- **Price and duration of the digital course** — please send them (or set them in the Courses screen).
- Native-speaker review of the new Hausa (all of `digital.js`, payment and certificate text) and recording of audio.
- Should the literacy course be required before the digital course? (Currently only recommended.)
- Refund and cancellation rules for paid access are not defined; today an admin cannot revoke access after accepting a payment (not built — tell me if you want it).
- A premium course changed back to free keeps existing enrolments; an enrolment with an end date still ends on that date.
- Attendance and payment records are not purged by the purge job (retention rule still to decide, see Phase 7).
- Amounts are plain naira integers; no tax/receipt numbers yet.
