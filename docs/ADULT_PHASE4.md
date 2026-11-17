# ASARTUN ADULT LEARNING — Phase 4 report
Hausa literacy lessons (Course A) with guided handwriting, using the phone's own voice for sound.
**Status: written and statically tested. NOT yet run in a browser or on a phone, and migration 019 has not been executed.**

## 1. To apply
1. Run `supabase/migrations/019_adult_lesson_progress.sql` on the test project (after 017 and 018).
2. Rebuild the app. No new package is needed and no new environment variable.
3. On a phone: sign in as a learner, join "Basic Literacy" under Darasi, open the lessons.

## 2. What exists
* **45 lessons** (`src/adult/curriculum.js`): 26 letters (vowels first), 10 words, "write my name", 5 short sentences, 3 everyday messages.
* Each **letter lesson** follows the brief's order: TEACH (letter in capital and small form, example word) → SHOW (animated demonstration; green dot = where writing starts, arrow = direction) → PRACTICE/trace over a faint guide → WRITE alone, then compare with the model and say how it went → CHALLENGE (match the small letter to the capital; find the word that has the letter) → REVIEW → PROGRESS saved.
* **Tracing guides** for all 26 Hausa letters (`src/adult/guide.js`), including the hook letters Ɓ Ɗ Ƙ Ƴ (the hook is its own stroke, so leaving it out fails the check). Words are traced letter by letter; sentences one word per line so letters stay large enough.
* **Tracing check**: passes only if most of the guide was covered, the ink stayed near the guide, and every stroke was followed. A failed attempt can be retried; after two tries the learner may continue, so nobody is stuck.
* **Sound**: recording first (if one is added later), otherwise the phone's own voice. A listen button appears only when the phone has a voice for that language.
* **Progress** (`adult_lesson_progress`): finished runs, best tracing score, the learner's own rating of independent writing, reading-choice results. Flags "practise again" when a lesson was finished but tracing, writing or choices were weak. Shown to the learner (lesson list, home) and to facilitators (learner file).
* If the network drops while saving, the result waits on the phone and is sent later (up to 6 tries).

## 3. Files
Created: `src/adult/guide.js`, `curriculum.js`, `progress.js`, `progressQueue.js`, `speech.js`, `pages/Lessons.jsx`, `supabase/migrations/019_adult_lesson_progress.sql`, this file.
Modified (all inside the adult module, plus tests): `components/HandwritingCanvas.jsx` (guide, arrows, demo animation, aspect ratio), `components/AdultAudio.jsx` (phone voice), `pages/Assessment.jsx` (voice), `pages/Learner.jsx`, `pages/Teach.jsx`, `AdultApp.jsx`, `adultApi.js`, `strings.js`, `adult.css`, `scripts/test-adult.mjs`. No existing children's file changed in this phase.

## 4. Database change
One table `adult_lesson_progress` (RLS: learner reads own, facilitator reads only learners in their classes; no direct writes) and one function `adult_record_lesson` (needs a live enrolment, validates every field, a retry of the same run is not counted twice, "completed" never reverts). `adult_staff_learner_detail` is replaced (same signature) to include progress.

## 5. Tests run
`npm run test:adult` → 1,829 checks pass. New in this phase: every letter guide is inside its box and renders inside the canvas at a traceable size; perfect and wobbly traces pass; scribbles, shifted traces, half-written words, missing strokes and missing hooks fail; the curriculum (keys, step order, every example word contains its letter, exactly one right answer per question); progress rules; app/database agreement on result fields; the phone-voice rule. I broke eight things on purpose and confirmed the tests caught each. The letter shapes were rendered to an image and inspected by eye. All older test scripts still pass.

## 6. NOT verified — please test on the real phones
* Nothing has run in a browser. The canvas (drawing, arrows, animation, the green dots) and the tracing tolerance are untested on real touchscreens. Tolerance values are my estimate; they may need adjusting after watching real learners. Sentence letters are smallest (about 40–60 px tall on a small phone).
* **Hausa voice: unknown.** Whether your phones have a Hausa voice, and how it pronounces ɓ ɗ ƙ ƴ, can only be found out on the phone. If there is none, no listen button is shown for Hausa and learners see a note about adding a voice (in Hausa mode). Reading lessons then fall back to visual matching.
* The SQL has not been executed; expect small fixes on first run.
* Hausa words, glosses and sentences are a DRAFT and need a native speaker.
* The tracing check measures "did you follow the guide", not "is this the right letter". It is not handwriting recognition.

## 7. Decisions and limits
* **Curriculum lives in code, not database tables** (a change from the Phase 2 sketch). Reason: it holds stroke data and Hausa text that must be reviewed together and tested; admins cannot edit it without a deployment. It can be moved into tables later if needed.
* Block capitals are traced and written; small letters are shown (teach, match) but not yet traced.
* The eraser does not subtract from the tracing score (clear and undo do).
* Meanings are given in English only; Hausa-language meanings need the native speaker.
* Learner writing is not saved or sent in this phase (the review screen says so). Saving handwriting, photos and teacher review arrive in Phase 6.
* "Practical messages" are reading-only (choose the message you saw or heard).
