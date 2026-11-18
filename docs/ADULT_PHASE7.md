# ASARTUN ADULT LEARNING — Phase 7: attendance, reports, schedules (v0_9_8)

Status: built and checked by script only. **Never run against a database, in a browser, or on a phone.** Hausa text is a DRAFT.

## What was built
**Attendance** (Teach → Attendance): pick a class, open a session for a date (opening the same date twice returns the same session), mark each learner present / late / absent, "Everyone present" shortcut, save, correct later, remove a session opened by mistake. History of sessions with "n of m came"; attendance rate per learner beside each name. *Late counts as attending.* Closed classes are read-only.

**Class schedule**: days (Mon–Sun), start/end time, in person / online / both, location, note (e.g. online link). Edited on the class card or in the class report. Rules are checked in the app (`scheduleProblem`) and again in the database.

**Reports** (Teach → Reports):
- *Overview*: every class the person manages (adult admin = all), totals on top, one card per class.
- *Class report*: counts (needs support / keep an eye / on track / not enough information), pooled attendance, average assignment mark, reading/writing/counting/applying per class, learners sorted by need, schedule, teachers (adult admin can remove a facilitator from a class), and the written rules.
- *Learner report*: why the learner is flagged (each reason with its numbers), four skill areas with level and number of checks, lessons started/finished, average tracing, written-maths and multiple-choice accuracy, lessons to practise again, attendance (last 10 sessions), assignments, and the last 8 weeks.
- *Printing*: "Print or save as PDF" uses the browser's own print; a print stylesheet hides buttons/navigation and adds a header ("ASARTUN ADULT LEARNING", date, confidential). No library added.

**Learner "My progress"** (Home → My progress, `/adult/progress`): plain statements about the learner's own work (letters/words/sentences/numbers/calculations/money finished and how many are "solid"), what they have shown per skill in encouraging wording, lessons to repeat (linked), own attendance and marked-work counts, lessons finished per week, next step. No points, ranks, comparison, or teacher flags.

## "Needs additional support" — the rules (all in `src/adult/reports.js`, object `T`)
A flag is shown only with enough evidence; it is a prompt for the teacher, not a verdict. The same numbers are shown on screen in the "How … is decided" panel.

| Flag | Fires when | Serious when |
|---|---|---|
| attLow | ≥3 marked sessions and attendance < 60% | < 40% |
| absentStreak | last 2 marked sessions both absent | — |
| inactive / neverStarted | in the class ≥14 days and no lesson activity for ≥14 days | ≥28 days |
| practice | ≥3 finished lessons AND (≥3 need repeating OR ≥40% of them) | — |
| mathsLow | ≥6 written answers and < 60% matched the correct answer ("not sure" = half) | < 40% |
| choiceLow | ≥4 multiple-choice questions and < 60% right | < 40% |
| workLow | ≥2 marked assignments averaging < 50% of full marks | — |
| workOverdue | ≥2 assignments past due with nothing sent | — |

Status: any serious flag, or 2+ flags → **Needs additional support**; one flag → **Keep an eye**; evidence but no flags → **On track**; nothing recorded → **Not enough information** (never shown as fine).

## Measuring reading, writing, counting, applying
Pooled over *checks* (not lessons); levels need ≥4 checks (secure ≥80%, developing ≥60%, else building; fewer = "not enough yet").
- **Reading**: matching/finding the right letter or word (auto-marked choices) in literacy lessons.
- **Writing**: tracing check passed (≥ TRACE_OK 68%) + the self/facilitator rating of independent writing; letters, words and digits.
- **Counting**: written calculations + multiple choice in non-applied numeracy lessons.
- **Applying**: money, measuring, profit/savings lessons and the practical-message reading lessons.
Assignment marks are shown separately. **The app never reads handwriting.** The report says so.

## Database (migration 022, only adds objects)
Tables `adult_sessions` (unique class+date) and `adult_attendance` (one mark per learner per session), RLS on, browser SELECT only. A facilitator reads attendance only through classes they manage (`adult_can_manage_session`), NOT via `staff_can_see_learner`, so another class's attendance of the same learner is invisible. Functions (all security definer, empty search_path, authenticated only): `adult_open_session`, `adult_mark_attendance` (all-or-nothing, learner must belong to the class), `adult_remove_session`, `adult_set_class_schedule`, `adult_admin_unassign_facilitator`, `adult_report_data(class)` (raw facts, audit-logged, ≤300 learners), `adult_my_report()` (own data only; score visible only once marked). Judgements are made in JS, not SQL.

## Files
New: `supabase/migrations/022_adult_reports.sql`, `src/adult/reports.js`, `src/adult/pages/TeachReports.jsx`, `src/adult/pages/Progress.jsx`, this doc.
Modified (all inside the adult module): `adultApi.js`, `strings.js` (+~190 keys, ha+en), `adult.css`, `AdultApp.jsx` (route), `Learner.jsx` (link), `Teach.jsx` (tabs, schedule on class card), `scripts/test-adult.mjs`.
Children's app, `/admin`, `/org`, `src/main.jsx`: **untouched** (diff against v0_9_7 confirms).

## Verification
- `node scripts/test-adult.mjs`: **4,256 checks pass** (794 new: every rule at and just below its threshold, skill pooling, weekly buckets, schedule rules, SQL structure and app/SQL agreement, privacy of the learner view, no new dependency, print wiring).
- Mutation check: 34 deliberate breaks (thresholds, `<` vs `<=`, late counting, permission checks, class scoping, score exposure, grants, API names, print CSS, missing sentences…); first run missed 4, tests were tightened, then **all 34 caught**.
- All six `scripts/test-*.mjs` pass. `tsc --noResolve` on changed JS/JSX: no syntax or undefined-name errors.
- **Not done:** migration 022 never executed (no Postgres here; syntax/logic errors in SQL are possible); no `vite build`; no browser or phone run; print never tried on a phone; Hausa unreviewed.

## To deploy and try
1. Run `022_adult_reports.sql` (after 017–021). 2. Deploy the app. 3. As a facilitator: set a class schedule, open a session, mark attendance, open Reports. 4. As a learner: Home → My progress. 5. Try Print on an Android phone.
Please report: SQL errors, whether `adult_report_data` returns for a class with learners, print layout, and whether the rule thresholds feel right to teachers.

## Known limits / decisions to confirm
- Progress rows hold the **best and last** result per lesson, not every attempt; "over time" = when lessons were finished, sessions attended, work marked.
- Reading evidence is thin (matching/finding only). Writing relies partly on self-rating.
- Thresholds above are my defaults — real teachers should confirm them (one place to change: `T`).
- Reports and the attendance screen load a whole class's raw rows (fine for a pilot; a lighter summary function is needed at scale). The all-classes overview makes one call per class (max 30).
- Only current members appear in a class report; past attendance of someone who left stays stored but is not shown.
- **Retention question:** the purge job deletes photos/handwriting 2 months after closing a class but does **not** touch sessions/attendance. Decide whether attendance should also be purged. Deleting a learner's account does delete their attendance (cascade).
- Learners can see their own attendance and marked-work counts.
- The date picker blocks future dates; the database allows today+1 (time zones).
- The Teach page title still prints on paper (cosmetic).
