# ASARTUN ADULT LEARNING — Phases 5 and 6 report
Phase 5: numeracy and handwritten mathematics.  Phase 6: saved handwriting, photo assignments, teacher review.
**Status: written and statically tested (3,462 checks). NOT yet run in a browser or on a phone; migrations 020 and 021 and the purge function have not been executed or deployed.**

## 1. To apply (test project first, in this order)
1. Run `supabase/migrations/020_adult_numeracy_progress.sql`, then `021_adult_work.sql` (after 017–019).
2. Deploy `supabase/functions/adult-purge` and set its secret `PURGE_SECRET` (a long random string, 24+ characters). Schedule a daily POST to it with the header `x-purge-secret`. Scheduling is not set up for you.
3. Rebuild the app. No new package, no new environment variable.
4. Join "Basic Numeracy" under Darasi. In `/adult/teach`: create a class, add learners, then Work → Assignments → New assignment.

## 2. Phase 5 — what exists
* **44 numeracy lessons** (`src/adult/numeracy.js`): digits 0–9 (teach → watch → trace → write → count/choose), counting objects, numbers 10–20, tens, 100; comparing numbers; adding and subtracting (to 5, 10, 20, and bigger numbers); times 2/5/10 and mixed; sharing/dividing; Naira (notes, adding, taking away, change, market totals, price of several, sharing money); measuring (kg, litres, metres); everyday finance (profit, savings).
* **Handwritten answers**: for a sum such as 10 + 5, the learner WRITES the answer with a finger on the screen. The app does not read handwriting. It then shows the correct answer, and the learner (or the facilitator sitting with them) says: "Yes, the same", "I am not sure" or "No, it is different". Multiple-choice questions are marked automatically.
* Each lesson has a worked example, 3 written calculations and 1 multiple-choice question.
* **Digit tracing guides** 0–9 (same stroke/arrow/check system as letters); the check also covers multi-digit numbers (12, 40, 100).
* **"Can they really calculate?"**: the database keeps `best_calc` (written answers that matched, "not sure" counting half) and the multiple-choice score; a lesson is flagged "practise again" when written answers often differ or choices were wrong, even if the lesson was finished. Facilitators see this on the learner's file.
* The assessment's numeracy advice (numbers / add_sub / mult_div / money) now opens the matching unit.
* Both courses share one lesson player (`src/adult/courses.js`). Going Back and answering again replaces the earlier answer instead of counting twice.

## 3. Phase 6 — what exists
* **Assignments**: a facilitator sets an assignment for a class they manage (title, instructions, how to send: screen / photo / either, optional due date, full marks) and can close or reopen it.
* **Learner**: the Write tab lists work from the teacher with a clear state (not sent / sent, waiting / marked / try again / closed). The learner sends by **writing on the screen** (saved as small vector strokes; kept as a draft on the phone until sent) or by **photo of the exercise book** (camera or gallery).
* **Photos**: type and size are checked, the picture is shrunk in the phone (about 1280 px, about 450 KB; 960 px in low-data mode), previewed, uploaded to a **private** bucket and then submitted. Sending again replaces the earlier attempt; after marking, another attempt is possible only if the teacher asks. A retry of the same upload is stored once.
* **Teacher review**: a queue (waiting / asked to redo / marked); the teacher sees the handwriting or the photo and marks **directly over it** with a red pencil, a yellow highlighter, eraser, undo and clear; adds a score and a written comment; then saves as reviewed or asks for another attempt (a missed due date shows as "late").
* **Learner feedback**: the learner sees their work with the teacher's marks, the score and the comment.
* **Retention (2 months)**: closing a class starts the clock. `adult-purge` removes the files with the storage API first and the database rows only afterwards. Deleting a learner's own account first removes their photos through the storage API.

## 4. Files
Created: `src/adult/numeracy.js`, `courses.js`, `work.js`, `imageTools.js`, `pages/Work.jsx`, `pages/TeachWork.jsx`, `components/WorkViewer.jsx`, `supabase/migrations/020_adult_numeracy_progress.sql`, `021_adult_work.sql`, `supabase/functions/adult-purge/index.ts`, this file.
Modified (all inside the adult module and tests): `guide.js` (digits), `progress.js` (aggregation, calc rules), `components/HandwritingCanvas.jsx` (underlay, overlay, red pencil, highlighter, saved drafts), `pages/Lessons.jsx` (both courses, calc and pick steps), `pages/Learner.jsx`, `pages/Teach.jsx`, `AdultApp.jsx`, `adultApi.js`, `strings.js`, `adult.css`, `scripts/test-adult.mjs`. No existing children's file changed.

## 5. Database changes
020: column `best_calc` and a replaced `adult_record_lesson` (new result fields validated, same signature) and `adult_staff_learner_detail`.
021: tables `adult_assignments`, `adult_submissions`, `adult_feedback` (all with RLS; the browser can only read), column `adult_classes.closed_at`, private bucket `adult-submissions` (1.5 MB, jpeg/png/webp) with storage rules (own folder only; class staff may read), and functions to create assignments, submit work, review, list the queue, close a class, plus service-role-only retention functions. A facilitator can see work only for assignments of classes they manage.

## 6. Tests run
`npm run test:adult` → 3,462 checks pass. New: all digit guides render inside the canvas and trace correctly; **every one of the 130 numeracy questions is recomputed independently from the text shown on screen** (whole, positive, exact answers; right option marked; counts equal the dots); every Hausa key exists; answer aggregation; photo validation, resizing and stroke packing; assignment states; and the database rules (private bucket, own-folder uploads, one live attempt, attempt limit, no replacing marked work, facilitator scope, score validation, retention both in listing and deletion, files before rows). Mutation checks: about 30 deliberate breaks across both phases; the first round of each phase let a few through, which exposed weak tests that I fixed until every break was caught (a few breaks that left the code still valid, like changing 3 weeks to 7, were rightly not flagged). The digit guides were rendered to an image and checked by eye. All older tests still pass.

## 7. NOT verified — please test on real phones
* **Nothing has run in a browser.** The camera/gallery input, `createImageBitmap` photo shrinking, the preview, the upload, and the teacher's drawing over a photo have never executed. iPhone HEIC photos are rejected with a message (the browser cannot shrink them); Android camera JPEGs are expected to work.
* **The SQL and the purge function have never been executed**; expect small fixes. Storage policies in particular must be tried with a real learner and a real facilitator account.
* **Do the access checks on the test project** (learner A cannot open learner B's photo; facilitator of class X cannot open class Y's work; a facilitator cannot read a photo path directly; a learner cannot mark their own work).
* Photo uploads need a connection; if it drops, the learner sees an error and the prepared photo stays on screen to tap Send again. A photo is **not** kept after the page is closed. Handwriting drafts are kept on the phone.
* Teachers cannot erase marks made in an earlier review session (new marks are added to the old ones).
* The teacher's pen colour is red and the app does not flatten marks into the photo; marks are stored separately as vectors.
* The scheduler for `adult-purge` is not set up. Until it runs, nothing is deleted automatically.
* Hausa wording (lessons, assignments, messages) is a DRAFT for a native speaker. Number words (sifili, ɗaya, biyu …) are in `numeracy.js` and are pinned by a test so any change is deliberate.
* The tracing and "was it the same?" checks are not handwriting recognition. A person always decides whether handwriting is right.

## 8. Decisions and limits
* Written maths is a self-check by design (or facilitator-checked in a session). If automatic marking is needed, use the multiple-choice items.
* Money answers are written as digits only (₦ is shown in the question and the correct answer).
* Lesson writing (letters, numbers, calculations) is still **not** sent to teachers; only assignments are. The lesson review screen says so.
* Late work is accepted and marked "late" for the teacher.
* Attendance, class reports and learner performance reports come in Phase 7.
