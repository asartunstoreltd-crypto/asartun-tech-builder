# Missions 08–14 (new trades and skills)
Owner: ASARTUN STORE LIMITED. Each mission follows Learn → Watch → Practice → Challenge → Quiz → Prize, in Hausa and English, with the safety rule “real work is for trained adults; the app is a game and a simulation”.

| # | Mission (Hausa / English) | What children learn | Adult-only (shown as 👩🏾‍🏭) |
|---|---|---|---|
| 08 | Yin Bulon Gini da Interlock / Bricks and Interlock Making | sand, cement, water, mould and press, curing; cement block, interlock block, curing and stacking | handling cement, press, lifting blocks |
| 09 | Kiwon Kaji da Kifi / Poultry and Fish Farming Basics | chicks, chicken house, feed and water, fish pond, vet and vaccines | vaccines, cleaning droppings, locking up, preparing and harvesting the pond, sick or dead birds |
| 10 | Sarrafa Lemun ’Ya’yan Itace / Fruit Juice and Local Drinks | zobo, fruit juice, tigernut drink (kunun aya), hygiene, keeping cold | boiling, hot liquid, knives, blender |
| 11 | Kere-keren Yumɓu da Tukwane / Clay and Pottery Crafting | preparing clay, coil pots, slow drying, firing | digging clay, kiln or fire, hot pots, clay dust |
| 12 | Kanikanci da Gyaran Keke / Simple Mechanics and Bicycle Repair | puncture repair, chain care, brake check, parts and their jobs | tyre levers, spanner, oil, chain, adjusting brakes |
| 13 | Yin Gawayin Girki daga Shara / Charcoal Briquettes from Waste | sawdust and shells, charring, starch binder (from cassava), pressing, sun drying, saving trees | charring (fire, smoke, carbon monoxide), crushing char, cooking starch |
| 14 | Dinki da Gyaran Tufafi / Tailoring and Basic Stitching | measuring, hand stitching, sewing on a button, a simple bag, tools by job | scissors, sewing machine, iron |

Each mission has: 9 learning pages, 3–4 processes to watch and practise (child steps are marked 👧🏾, adult steps 👩🏾‍🏭), a sorting challenge, a safe-or-ask-an-adult challenge, the business calculator, 7 quiz questions (wrong answers get an explanation and another try), and a new badge:
Brick Builder · Farm Starter · Juice Maker · Potter · Bike Fixer · Charcoal Maker · Tailor.

## Add them to your database
- **New database:** run `003_seed_content.sql` (already contains all 14 missions and the new “Trades and Skills” category). Do not run 007 or 009.
- **Existing database** (already ran 003): run `009_publish_missions_08_14.sql` (needs 001–006). Safe to run twice. The database checks Hausa + English before publishing.
- Without Supabase nothing is needed: the missions are built into the app.

## Please have these reviewed before launch
- A Hausa speaker (teacher/parent) for all new text. Trade words (interlock, blender, sensor-like terms, kunun aya, zobo) may differ by region.
- Subject experts: a mason (08), a vet or agricultural extension officer (09), a food-hygiene officer (10), a potter (11), a bicycle mechanic (12), someone experienced in charcoal/biomass safety (13), a tailor (14).
- Special care: **13** (fire, smoke and carbon monoxide) and **09** (animal diseases). The lessons only teach children to keep away and tell an adult. A responsible adult must supervise any real activity.
- The lessons deliberately give no exact mixing ratios, temperatures or dosages. Real work follows a trained adult.

## How these were built
`src/data/dsl.js` has short helpers (L, S, K, page, proc, item, quest…), so a new mission is one small file. Copy any `*Mission.js` as a template, register it in `src/data/registry.js` and `src/data/missions.js`, run `npm run check:missions`, then `node scripts/generate-seed.mjs` to produce the SQL. Missions can also be created without code in Admin → Missions.
