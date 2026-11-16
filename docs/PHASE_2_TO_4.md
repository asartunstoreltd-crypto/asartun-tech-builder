# Phase 2–4 — what was added, how to apply it, and what is NOT verified

Owner: ASARTUN STORE LIMITED. Version 0.9.4 (drafts for review).

## What was added
**Phase 2 — new activity types** (all run inside the existing MissionEngine; no new engine)
| Type | Child does | Files |
|---|---|---|
| `predict` | predicts, then sees a model result and the explanation | `games/PredictGame.jsx` |
| `sim` | changes settings, runs tests, records readings in a table, finds the best | `games/SimLab.jsx`, `lib/sim.js` |
| `business_plus` | unit cost, one-off cost, price, units → profit and break-even | `games/BusinessPlan.jsx`, `lib/business.js` |
| `reflect` | answers guiding questions in their own words (design brief, presentation) | `games/ReflectGame.jsx` |

Admin can create and edit all four (Admin → Mission → Lesson → ADD LEARNING STEP): `admin/blocks2.jsx`, `admin/api.js`, `admin/LessonTab.jsx`, `admin/validate.js`.
Numbers in `predict` and `sim` are **model values** the author writes. The child screen says "model, not a real measurement".

**Phase 3 — content (all DRAFT)**: Home Device Level 2 (`device-l2`, copy of `device` + science/design additions), Paper and Cardboard Level 1 and 2 (`paper-l1`, `paper-l2`). Home Device Level 1 and 3 came in migration 014.

**Phase 4 — competencies, portfolio, teacher assessment** (migration 015)
* 8 skills (identify materials … present ideas). Content managers tag lessons with the skills they build (Details tab).
* Child's portfolio: work from `reflect`, `predict`, `sim`, `business_plus` is saved (device first, then database). Child page: Dashboard → "My projects".
* School portal `/org` → **Skills & projects**: class skills overview, each learner's projects, 1–4 assessment with a short comment (the child can read it), delete.
* The 1–4 scale: 1 needs a lot of help · 2 with some help · 3 alone · 4 alone and can explain or improve it.

## Order to apply (Supabase SQL Editor, one file at a time)
`012` → `013` → `014` → `015` → `016`. (Each is safe to run twice.) Then `npm install` and `npm run dev`.

## Commands
`npm run test:business` · `test:variants` · `test:phase2` · `test:device` · `test:phase3` · `check:missions`
`npm run generate:device` / `generate:phase3` rebuild migrations 014 / 016 from the files in `src/data`. Do not edit those two SQL files by hand.

## Checks that DID run (in the build environment)
The JavaScript logic tests above all pass; every changed `.js/.jsx` file passes a TypeScript syntax check; SQL files pass structural checks (balanced quotes and brackets).

## NOT verified — please test before use
* **No SQL was executed.** There was no database. Run 012–016 on a **test project first**.
* **The app was not built or opened** (`npm run build`/`dev` not run). Screens (new games, My projects, Skills & projects, admin editors) have not been seen in a browser.
* Hausa text and all science statements are drafts. A science teacher and a native Hausa speaker must review them before publishing.
* The new database functions have not been tested with real teacher/learner accounts. Test: a teacher must NOT be able to open a learner of another school; a child must NOT be able to assess; a child must NOT see another child's portfolio.

## Safety and privacy notes
* Children type free text in `reflect` answers. They are told not to write their name, phone number or address, but the database cannot detect that. Teachers should check entries. Consider a short parent notice.
* Teachers see portfolios only for learners who joined their school (database rule) and every view is logged.
* Teacher scores are practical assessments by the school. They are **not** an accredited qualification, and the app must not be described that way.
* Illustrative numbers (temperatures, "books held", prices) are model values, not measurements or market prices.

## Publishing the drafts
Admin → Missions → open the draft → check Preview → fix text → Publish. When `device-l2` is published it replaces `device` on the dashboard automatically (same family, same level, newer lesson wins). Archive the old `device` afterwards. Mission numbers of new lessons continue after the last existing number; change `mission_no` in the database if you want another order.
