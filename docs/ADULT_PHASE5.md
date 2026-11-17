# ASARTUN ADULT LEARNING — Phase 5 report
Numeracy (Course B, `basic-numeracy`) and handwritten mathematics.
**Status: written and statically tested. NOT run in a browser or on a phone; migration 020 has NOT been executed.**

## 1. To apply
1. Run `supabase/migrations/020_adult_numeracy.sql` on the test project (after 017–019).
2. Rebuild the app. No new package, no new environment variable.
3. Phone: sign in as a learner, join "Basic Numeracy" under Darasi, open the numeracy lessons (`/adult/numeracy`).

## 2. What exists
**42 lessons in four units** (they match the assessment's start points `numbers`, `add_sub`, `mult_div`, `money`):
* Numbers (16): digits 0–9 (teach, demonstration, trace, write alone, pick the digit, count objects), counting to 10 and 20, bigger/smaller, tens, writing numbers from dots, unit check.
* Add/subtract (9): within 10 and 20, two-digit, with carrying, with borrowing, unit check.
* Multiply/divide (8): repeated addition, ×2, ×5, ×10, ×3/×4, sharing equally, ÷5/÷10, unit check.
* Money (9): Naira notes, adding prices, change, quantity × price, profit/loss, kilos and litres, weekly saving, debt, unit check.
All sums and answers are in `src/adult/numeracy.js`; Naira (₦) is used in every money lesson.

**Handwritten answers.** The `calc` step shows e.g. `10 + 5 = ?`; the learner WRITES the answer with a finger. "Done" stays disabled until real pen ink exists (a dot or only eraser lines is not an answer); "I do not know" is an honest alternative and is recorded as not matching. After "Done" the ink is locked but stays visible, the correct answer and the worked line appear, and the learner says: same / nearly (needed help) / different.

**How handwritten answers are checked (honest version).** The app never reads handwriting. Two signals are kept apart:
* *Self-marked* written answers (an opinion, stored as `last_calc_self`).
* *App-marked* multiple-choice questions on different sums (objective, stored as `best_quiz`). Each calculation lesson has 4 written + 2 app-marked; each unit check has 4 + 4.
* `calcEvidence()` (src/adult/progress.js) combines them: `shown` (app-marked mostly right, and the learner's view agrees), `building`, `practise`, `mismatch` (says "all matched" but the app-marked answers disagree: flagged for a facilitator), `none`. "Lesson finished" with weak evidence is still flagged "practise again".
* Only a facilitator can mark a skill **confirmed**: in the learner file, per skill area, "watched in person: can / with help / not yet" (`adult_skill_checks`, logged). Learners see a "confirmed by a facilitator" tag on that unit.
* Limit: a 4-option question can be guessed (25%); that is why several are asked and why self-view and app-marked results are compared rather than trusted alone.

**Digit guides 0–9** (`DIGIT_GLYPHS` in guide.js, separate table so the letter tables and letter tests are unchanged). Rendered to an image and inspected by eye; same tracing check as letters.

## 3. Files
Created: `src/adult/numeracy.js`, `numeracyStrings.js`, `courses.js`, `lessonResults.js`, `pages/MathSteps.jsx`, `supabase/migrations/020_adult_numeracy.sql`, this file.
Modified (all inside the adult module + tests): `guide.js`, `progress.js`, `strings.js`, `adult.css`, `adultApi.js`, `AdultApp.jsx`, `pages/Lessons.jsx` (player and list now serve both courses), `pages/Learner.jsx`, `pages/Teach.jsx`, `scripts/test-adult.mjs`.

## 4. Database changes (020)
* New table `adult_skill_checks` (RLS: learner reads own, staff only learners they may see; no direct writes) and function `adult_staff_confirm_skill` (caller must be staff for that learner; logged; learners cannot confirm themselves).
* `adult_record_lesson` replaced, same signature: accepts `calcN, calcYes, calcHelp, quizN, quizRight` (whole numbers 0–50, rejects more right than asked), keeps the enrolment check, retry-safety and "completed never reverts".
* Two columns added to our own `adult_lesson_progress`: `best_quiz`, `last_calc_self` (additive; nothing dropped).
* `adult_staff_learner_detail` replaced, same signature: adds the new columns and the latest skill check per skill.

## 5. Tests actually run
`npm run test:adult` → **3,475 checks pass** (was 1,829). New: digit guides (inside box, size, perfect/wobbly pass, shifted/missing-stroke/wrong-digit fail); curriculum shape; **every question is evaluated and compared with its stored answer** (no wrong answer key can ship); options unique and right answer in all positions; Naira/kg/L units; result keys vs SQL; evidence rules including mismatch; step wiring (app-marked vs self-rated counters, Done needs ink, ink locked, no recognition code); SQL structure of 020. All other `scripts/test-*.mjs` pass. JSX/JS syntax and undefined names checked with `tsc --noResolve` (only the Deno global in the Edge Function is reported, as before).
**Mutation check:** I broke the code 16 ways (answer key, evidence rules, empty-canvas rule, SQL grants/checks/search_path, counter wiring, strings, paths). 15 were caught at once; one (app-marked answers sent to the self-rating counter) was missed, so I strengthened that test and re-ran the mutation: now caught. Also fixed during testing: exactly-50% results now count as "practise".

## 6. NOT verified — please test on the real phones
* Nothing ran in a browser: the answer canvas, the dot groups, button sizes and the flow are untested on Android. Four-digit answers use a wider canvas; check they are comfortable.
* The SQL has never been executed; expect small fixes on first run. RLS was checked structurally, not by signing in as different users.
* **Hausa is a DRAFT**: number words (sifili, ɗaya, biyu … ɗari), tens, maths terms and the teaching texts need a native speaker. No recordings exist; the phone's Hausa voice (if any) reads number words, otherwise no listen button appears.
* Evidence thresholds (70% self, 80% app-marked, mismatch at 80%/<60%) are my estimates and may need tuning after real use.
* Sums are fixed per lesson (same questions every time); there is no random variety yet.
* Word problems are symbolic (e.g. `₦100 − ₦65 = ?`) with a short context line, not full sentences.
* The Home note "lessons are being prepared" still shows (the digital course is not built).
* Written answers are not saved or sent (only counts); saving handwriting comes in Phase 6.
* Children's app: `src/main.jsx` and every file outside `src/adult/`, `scripts/test-adult.mjs` and the new migration are byte-identical to v0.9.6 (checked by diff). I have not opened the children's app.
