# Lesson levels (by age), risk, and lessons chosen by each school / company
Owner: ASARTUN STORE LIMITED. Needs migrations 001–006, 010 and `011_levels_and_curriculum.sql`.

## Taƙaitawa (Hausa)
1. **Matakai (Levels):** kowane darasi yana da **matakin shekaru** da **matakin haɗari**. Yaro yana buɗe darussan da suka dace da shekarunsa kawai. Darussa masu **haɗari mai yawa** (misali gawayin girki, wuta da hayaƙi) suna buƙatar a san shekarun yaro, kuma na manyan yara ne.
2. **Zaɓen darussa na ƙungiya:** makaranta ko kamfani tana zaɓar darussan da take so; ɗaliban ta za su ga waɗannan kaɗai. Idan ba ta zaɓi komai ba, suna ganin duk darussan da shekarunsu ya ba da dama.
3. Database ne ke tilasta waɗannan dokoki, ba app kaɗai ba.

## 1. Levels (age groups) and risk
- Three starting levels: **Level 1 · Younger (ages 5–10)**, **Level 2 · Middle (11–13)**, **Level 3 · Older (14–17)**. Edit, add or delete them in **Admin → Levels & safety**.
- Each mission also has a **risk level**: *Low* (nothing dangerous), *Medium* (the real activity needs an adult: heat, sharp tools, electricity), *High* (serious hazards: fire, smoke, chemicals). Set in the mission’s **Details** tab or in bulk on **Levels & safety**.
- First placement of the 14 built-in missions (change it as you wish):
  - Level 1: Cassava, Potatoes, Waste, Compost, Tailoring, Juice
  - Level 2: Solar, Robot, Home device, Pottery, Poultry & fish, Bricks, Bicycle
  - Level 3: Charcoal briquettes (**High** risk)
- **Rule:** a child can open a lesson only if their age band reaches the level’s youngest age. A child with **no age** counts as 8–10, and is treated as too young for **High**-risk lessons.
- Children now **choose their age band when they start** (required when Supabase is on) and can change it in Settings, **unless they belong to a school/company**: then only the organization can change it (Learners → **Set age**).
- Locked lessons show “🔒 Ages 11+” and lessons with real-world risk show “⚠️ With an adult”. The dashboard groups lessons by level.
- Lessons of a level that is too high are **unreadable** for that child in the database (steps, questions, pictures and audio), even with a modified app.

## 2. School / company chooses its lessons
- **Admin → Schools & companies → the organization → Lessons**, or in the school’s own portal `/org` → **Lessons** (organization admin edits; teachers only view).
- Tick the lessons you want and save: learners of that organization see **only those**. Quick buttons tick a whole level. **Nothing ticked = all lessons their age allows.**
- Age rules, premium and the High-risk rule still apply on top. A learner in several organizations sees the union of what they allow (and everything if any of them has no limit).
- A suspended organization stops limiting its learners (they become independent learners).

## Setup
1. SQL Editor: run `supabase/migrations/011_levels_and_curriculum.sql` (safe to run twice).
2. Admin → **Levels & safety**: check the level and risk of each lesson.
3. For each school: Organizations → Lessons → tick and save. Use **Set age** for its learners if they joined without an age.
4. Test: make a test learner aged 8–10 and check that Level 2/3 lessons are locked; join a test organization that allows only 3 lessons and check that only those appear.
No new packages or environment variables.

## Honest limits
- **Ages are self-reported.** A child on their own device can pick an older age. Parents (or the school, which controls the age of its learners) are the real control. For lessons you consider dangerous, set the level high and the risk to High.
- Points can still be sent for a lesson a child cannot open (they cannot see its content, so this is not useful); I did not change the points function.
- The age rule uses bands (5–7, 8–10, 11–13, 14–17), not exact birthdays.
- Choosing a lesson for an organization hides it for its learners, but does not change premium or payments.
- I could not run the SQL or the app here (no internet). Please test as described.
