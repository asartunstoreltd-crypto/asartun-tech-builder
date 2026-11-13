# ASARTUN TECH BUILDER — Content Management System (CMS)
Owner: ASARTUN STORE LIMITED

Admins create, edit, preview and publish missions at `/admin/missions`. Learners see only what is **Published**.

## What was inspected first
The project already had: Supabase schema (`001`–`004`: missions, mission_steps, game_questions, rewards, media_assets, admin_roles, activity log, RLS, Hausa+English publish check), an admin login + dashboard, and a learner app that read only the built-in `src/data/*.js` files.
Reused as-is: all tables, roles, RLS, `has_admin_role`, the publish translation trigger, the audit log, the `media` bucket, the learner `MissionEngine` and games.

## Changed / new files
| File | What |
|---|---|
| `supabase/migrations/005_cms_extensions.sql` | **NEW.** Review status, lesson metadata, media kinds, edit stamps, guards, private bucket, ordering/duplicate functions |
| `src/lib/missionStore.js`, `src/lib/useMissions.js` | **NEW.** Learner app loads PUBLISHED missions from Supabase and turns them into the existing engine format |
| `src/admin/api.js` `validate.js` `ui.jsx` `blocks.jsx` | **NEW.** Database calls, pre-publish checks, shared widgets, step editors |
| `src/admin/MissionList.jsx` `MissionEditor.jsx` `DetailsTab.jsx` `LessonTab.jsx` `PreviewTab.jsx` `PublishTab.jsx` `MediaField.jsx` `MediaLibrary.jsx` `ActivityLog.jsx` | **NEW.** The CMS screens |
| `src/admin/AdminApp.jsx` `AdminLayout.jsx` `admin.css` | **CHANGED.** New routes, menu, styles |
| `src/App.jsx` `src/pages/Parent.jsx` | **CHANGED.** Missions come from `useMissions()` (database first, built-in as offline fallback) |
| `src/components/MissionEngine.jsx` `ProcessDemo.jsx` `AudioButton.jsx`, `src/games/SortGame.jsx` `QuizEngine.jsx`, `src/lib/narration.js`, `src/styles/app.css` | **CHANGED.** Show images / video / instructions, custom sorting groups, uploaded audio; **no audio button when no audio exists** |

No new npm packages. No new environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as before). The `service_role` key is never used.

## Setup
1. SQL Editor: run `005_cms_extensions.sql` (after 001–004). Safe to run twice.
2. Storage: nothing to click. 005 makes the `media` bucket **private** (30 MB limit, allowed types listed in the file). Check Storage → media → *Private*.
3. Make sure the people who manage content have the `content_manager` role (media-only people: `media_manager`). Super Admin has everything.
4. `npm install` then `npm run dev`. Open `/admin/login`.
5. Learners: if Supabase is configured they see only **Published** missions. Existing missions seeded by 003 stay published.

## How an admin works
1. **Missions → + Create New Mission** (Hausa + English title). Order by dragging ⠿ or ↑ ↓.
2. **Details:** descriptions, category, ages, difficulty, learning time, objectives, cover image.
3. **Lesson → + ADD LEARNING STEP:** pick one of 13 types. Edit, duplicate (⧉), delete (🗑), reorder.
   Upload Image / Hausa audio / English audio / animation or video on any step.
4. **Preview:** the real learner screens with your unsaved content. Test, switch HAUSA / ENGLISH.
5. **Check & Publish:** problems block publishing (missing Hausa or English, empty steps, quiz without answers, broken media). **Save Draft**, **Submit for review**, **Publish**, **Unpublish**, **Archive**, **Duplicate**.
6. **Media Library:** upload, preview, replace, “Where used”, delete. A file used by a published mission cannot be deleted (checked in the database and in storage).
7. **Activity log** (Super Admin): who changed what and when. Learners cannot read it.

## Security summary
- Only `content_manager` / `media_manager` / `super_admin` can write content (RLS, unchanged from 002). Learners can only read published rows.
- Bucket is private. Learners get 1-hour signed links, and the storage policy only allows media of **published** missions.
- Published missions are locked in the editor and cannot be deleted; delete needs typing the mission name.
- Publishing is re-checked by the database (Hausa + English), so a modified browser cannot bypass it.

## Honest limits (what still needs a developer)
- **Lesson order across parts is fixed:** Learn → Watch → Practice → Challenge → Quiz → Prize. Admins choose which parts to include and order the steps *inside* each part.
- **Demonstration, Interactive Practice and Ordering** use the same structure: the child watches the steps, then puts them in order with hints.
- **Drag and Drop** is “tap the right group” (2–4 groups). Free-position games, diagram labelling, matching lines, etc. are not configurable.
- **Simulation** means the built-in business calculator. Circuits, solar, robots and other simulations need a developer to build the interactive part first.
- **Points:** per challenge, per demonstration watched, per practice, per quiz answer (same for all questions) and the Learn / Finish stages. Not per Learn page.
- **Badges:** admins choose from existing badges. New badges are added in the `rewards` table and the learner Rewards page still lists the four built-in badges.
- Learner progress is still saved on the device (as before), not yet in the database.
- Animations = GIF / MP4 / WEBM (no Lottie). Uploaded files are checked by extension, size and declared type; the server cannot inspect file contents.
- Someone who opened a lesson just before it was unpublished may still load its media for up to 1 hour (signed link lifetime).
- Admin screens are in English. “Under review” is a status only: there is no separate reviewer role, any Content Manager can publish.

## Not verified here
This environment had no internet, so I could not run `npm install`, `npm run build`, or the SQL on a real Supabase project. I checked that all files parse and that every import and export resolves. Please test:
1. `npm run dev` and `npm run build` succeed.
2. Run 005; sign in as admin; create a mission with Hausa + English; add a Story, a Demonstration, a Drag and Drop, a Quiz question; upload an image and audio.
3. Preview works; Publish is blocked until Hausa and English are complete.
4. Publish; open the learner app: the new mission appears with the audio button only where audio exists.
5. Unpublish; reload the learner app: it disappears.
6. Try to delete media used by the published mission: it is refused.
