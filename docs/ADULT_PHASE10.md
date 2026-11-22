# ASARTUN ADULT LEARNING — Phase 10: content the adult admin can change without coding (v0_11_0)

Status: built and checked by script only. **Never run against a database, in a browser, or with a real microphone.** Hausa text is a DRAFT.

## What the adult admin can now do (Teach → Content)
1. **Correct any text, in Hausa or English** (Content → Texts): search all ~1,200 texts by name or words, edit Hausa and English side by side, **Save as draft** or **Publish**. Learners see only published text. A published correction replaces the built-in text; **"Go back to the built-in text"** undoes it. Each text can be marked **"checked by a speaker of the language"**, and the list can be filtered to texts not yet checked. A correction that removes or adds a `{placeholder}` the app needs (for example `{done}`) is refused by the screen and ignored by the app, so a typo cannot break a sentence.
2. **Add voice to any text, per language** (inside each text, and for every text of a dashboard lesson): **record with the phone's microphone** (up to 90 seconds, small files) or **upload an audio file** (up to 3 MB). Play it back, replace it, delete it. Learners hear the recording when they press Listen; if there is none (or it cannot be fetched) the phone's own voice is the fallback, as before. If a text is changed after it was recorded, the old recording is **not played** until the admin confirms it still matches or records again. This also gives Hausa a real voice on phones that have none.
3. **Correct the built-in lessons** (Content → Built-in lessons): pick a course and lesson and edit the text of its title, teaching page, questions, answers and reasons, and add voice. *The structure of those lessons stays in code* (letter tracing, number writing and the placement of the phone-screen questions cannot be redesigned here).
4. **Create new courses and write their lessons** (Content → New courses): a course has a short name, Hausa/English title and description, and the skill it measures (reading, counting, applying, phone/internet, safety, other). A lesson is built from four step types, **all marked automatically**: *teaching page*, *multiple-choice question* (2–5 options, the right one marked, optional reason), *message: safe or scam?*, and *touch the right place on a phone screen* (the admin taps the right place in the drawn picture). Up to 20 steps and 12 questions per lesson, up to 100 lessons per course. Lessons can be reordered, saved as drafts, published, taken off for learners, archived, restored from the last 10 published versions, and deleted only if never published and never started.
5. **Free or premium, price, duration, publishing** of a new course use the existing **Courses** and **Payments** tabs. Certificates, progress, reports and "My progress" work for dashboard courses too (a certificate needs all published lessons plus 60% of the automatically marked questions; handwriting plays no part).

Typical flow for a new course: Content → New courses → create → add lesson → write steps → **Publish** the lesson → add voice → Courses tab → set Published (free or premium) → learners see it on their Courses page.

## How it works (so you know what is safe)
- Everything the admin writes is data in the database. Learners can read **published** texts, recordings and lessons only. **Drafts and history are readable by the adult admin only** (not facilitators, not learners). Only the adult admin can write anything (checked in the database, not just in the screen).
- A learner can read the lessons of a dashboard course **only with an active enrolment** in it (so paid lessons are not readable without paying).
- Recordings are in a **private** storage bucket; a learner gets a short-lived link only when pressing Listen.
- The database checks a lesson again when it is published (`adult_cms_valid`), with the same limits as the screen (a test compares the numbers). Admin text is always shown as plain text, never as HTML.
- Progress is saved by each lesson's permanent random key, so reordering, renaming or correcting a lesson never loses anyone's progress.

## Changes to things that already existed (on purpose)
- `adult_courses`: new columns `origin` and `skill_area`; the `kind` check now also allows `'custom'`.
- Migration 024's `adult_calc_standard` and `adult_claim_certificate` are **replaced** (026) so dashboard courses can be certified. Built-in courses behave as before.
- Page header `Permissions-Policy`: **`microphone=(self)`** (was blocked) so the recorder can ask for the microphone — this site only; camera, location and payment stay blocked. Only `/adult` paths are affected.
- The lesson player gains a Listen button on questions, scam cards and tap instructions (they had none), and waits for content to load instead of redirecting.
- The children's app, `/admin`, `/org`, `src/main.jsx`: untouched (fingerprint test).

## Verification
- `node scripts/test-adult.mjs`: **9,954 checks pass** (about 1,000 new this phase): text lookup order and the placeholder protection; recordings and stale detection; turning dashboard lessons into player steps; registering and unregistering courses (built-in courses can never be replaced); lesson validation at every boundary; app and database limits equal; the whole of migration 026 (every policy, admin-only functions, storage rules, certificates); the screens, headers and recorder limits.
- Mutation checks: **40 new deliberate breaks for this phase; all caught** (the first pass missed 4 because my checks matched a number as the start of a bigger one — fixed everywhere in this phase's tests). The 34 + 38 + 42 breaks from Phases 7–9 are also still all caught: **154 in total**. All six `scripts/test-*.mjs` pass; `tsc --noResolve` finds no syntax or undefined-name errors.
- **Not done:** migration 026 was never run (no Postgres here); no `vite build`; **no browser, phone or microphone was used**; the recorder, the audio upload to storage, the signed links and playback on real phones are completely untested; Hausa unreviewed.

## Limits and risks to know
- **Recording formats differ by phone.** Android Chrome records WebM/Opus; iPhones record MP4/AAC. WebM plays on Android and recent iPhones but **may not play on older iPhones**. If learners use iPhones, upload an MP3 or M4A instead of recording in the dashboard. A recording that cannot play falls back to the phone's voice.
- A text published as a correction is downloaded by every learner at sign-in (small, but it is data). If the content cannot be loaded, the app keeps the built-in content, and dashboard courses will not appear until it loads.
- No image or video in dashboard lessons (text, voice and the existing drawn phone screens only). No live preview inside the lesson player: the admin tests by publishing a lesson in a draft course and enrolling a test learner (free course).
- Publishing a lesson changes it **immediately** for learners already in the course. Changing the right answer later does not re-mark people who already finished.
- Only the adult admin can edit. A separate "content editor" role (for the Hausa reviewer, without payment access) is an easy addition if you want it.
- "Checked by a speaker" is the admin's own statement; the app does not verify who checked.
- Text history is kept in the database (not shown in a screen); lesson history can be restored from the lesson editor.

## Manual check on real devices (about 20 minutes)
1. Run `026_adult_content.sql` (after 017–025). 2. As adult admin: Content → Texts → correct one Hausa text, Publish; sign in as a learner on another phone: the corrected text shows. Break a `{placeholder}` on purpose: refused. 3. Record a Hausa clip on an Android phone (allow the microphone), then play it as a learner (Listen). Change the text: the learner now hears the phone voice, not the old clip; Confirm: the clip returns. 4. Upload an MP3. 5. Create a course "test-course", add a lesson with one of each step type, Publish, add voice, set the course Published (free) in Courses; as a learner join and finish it; check it appears in My progress and the class report; claim a certificate. 6. Make it premium: a learner without payment cannot open the lessons (try reading `adult_cms_lessons` from the console: nothing). 7. As a facilitator: no Content tab; reading `adult_text_drafts` returns nothing. 8. Check `/adult` console: no Content-Security-Policy errors (including when playing a recording); `/`, `/admin`, `/org` unchanged.

## Files
New: migration `026_adult_content.sql`; `src/adult/content.js`, `contentLoader.js`, `components/AudioEditor.jsx`, `pages/TeachContent.jsx`; this doc.
Modified (adult module): `AdultAuth.jsx`, `adultApi.js`, `courses.js`, `reports.js`, `strings.js`, `components/AdultAudio.jsx`, `components/DigitalSteps.jsx`, `pages/Lessons.jsx`, `pages/Learner.jsx`, `pages/Teach.jsx`, `pages/TeachReports.jsx`, `pages/Progress.jsx`, `AdultApp.jsx`; `vercel.json` and `public/_headers` (microphone only); `scripts/test-adult.mjs`.

---

## Update v0_11_1 — fix: recordings did not reach the learner

**Reported:** an admin's recording was accepted in the dashboard but nothing appeared for the learner; the course screen only showed "Wayarka ba ta iya magana da Hausa…" and "An kammala darasi 0 cikin 45".

**Causes found (all mine, in Phase 10):**
1. In the 45 literacy lessons (and the number lessons) everything the app says aloud — letters, example words, sentences, number words, the word to find — is data in code with **no text key**, so a recording could not be attached to it and the player never looked for one. Only lessons built from text keys (the digital course and dashboard courses) could use recordings.
2. The note "your phone cannot speak Hausa" was shown even when recordings existed.
3. A learner who was already signed in did not receive new recordings until signing in again.

**Fix:**
- Every spoken item now has a recording slot whose key is made from the words themselves (`sp.<fingerprint>`). One recording of "gida" serves every lesson that says "gida", and a recording can never be played for different words.
- The lesson player uses a recording whenever one exists (also for the "hear it and find it" task, which previously required a phone Hausa voice). The assessment does too.
- Dashboard → Content → **Built-in lessons**: choose a lesson → **"What this lesson says aloud"** lists every letter sentence, word, sentence and question with Record/Upload, plus "n of m spoken items in this course are recorded".
- The Hausa-voice note disappears when every item in the course is recorded, and says "some lessons have recorded voice" when only some are.
- New recordings and corrections are picked up when a course or lesson opens and when the person returns to the app (at most every 30 seconds), without signing in again.

**Also fixed (older bug, Phase 3):** the letter-teaching sentence has `{upper}` twice, but only the first was filled, so learners saw (and would have heard) a literal `{upper}`. Every occurrence is now filled, here and for all texts.

**What the admin must do:** recordings made earlier on a text key stay, but they only play where a Listen button for that text exists (lesson texts do; screen titles and similar do not). To give the literacy and number lessons a voice, record the items listed under "What this lesson says aloud" (about 90 distinct items for the literacy course). Test on a phone with no Hausa voice.

**Verified by script only (never on a phone):** 10,425 checks pass (about 470 new: every kind of spoken item in all 89+30 built-in lessons has a slot; the key and fingerprint rules; every Listen button has a recording key made from the same words it would speak; the hint, refresh and dashboard wiring); 20 new deliberate breaks, all real ones caught (one deliberate wording change was correctly ignored); all earlier mutation suites still pass.

---

## Update v0_11_2 — Listen buttons on the learner's own screens

Requested after v0_11_1. Texts on the signed-in learner screens now have a Listen button (shown only if a recording or a phone voice exists):
- **Home:** the greeting, "start with the placement check", "your starting point", the note about more lessons.
- **Courses:** the page title, "coming soon", "no lessons yet", "your access has ended", "you have joined".
- **Course list (the screen in the report):** the course name, every section name, and the "n of m lessons finished" line.
- **My progress:** every sentence and heading. **Write** and **Help** texts.

**Recordings or phone voice?** A fixed text can use an admin recording. A text with a name or a number inside (the greeting "Barka, {name}", "{done} of {total} lessons") cannot be pre-recorded because its words change from person to person, so it uses the phone's voice only.

**Dashboard:** Content → **Learner screens** lists these fixed texts (grouped by screen, with course and section names) with a Hausa and an English recording slot each, and shows how many are recorded. A test guarantees the list contains exactly the texts that have a Listen button (so nothing is offered that learners cannot hear, and no button is left without a slot).

**Limit — screens before sign-in** (landing, sign-in, registration) cannot use recordings: they are stored in a private bucket that only signed-in people can read. They can still use the phone's voice. A small public bucket for a few pre-login prompts is possible if you want it.

Verified by script only: 10,597 checks pass (about 170 new); 13 new deliberate breaks all caught; all earlier mutation suites still pass; syntax check clean; never tried on a phone.
