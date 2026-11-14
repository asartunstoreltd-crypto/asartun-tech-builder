# Patch: fix Mission 03 + complete Missions 05, 06, 07

## Taƙaitawa (Hausa)
- **Mission 03 ta tsaya a challenge:** kuskure ne a `MissionEngine.jsx`. Challenge na biyu (safety) da na farko (sort) iri ɗaya ne, don haka app ɗin ya ɗauki na biyu a matsayin an riga an gama shi, bai nuna shi ba, kuma ba a ba da maɓallin “Ci gaba”. An gyara: kowane challenge yanzu yana da maɓalli na kansa. Wannan ya gyara dukkan darussa masu challenge biyu iri ɗaya (har da na CMS).
- **An kammala Missions 05 (Hasken Rana), 06 (Gina Ƙaramin Mutum-mutumi), 07 (Gina Na’ura don Matsalar Gida)** cikin Hausa da Turanci, tare da Koyo → Kallo → Gwada → Ƙalubale → Tambayoyi → Kyauta, tsaro, da lambobin yabo sababbi uku.
- Babu sake gina komai: kwafi fayilolin da ke cikin wannan patch a kan project ɗinka (wuri ɗaya da suke ciki a zip), sannan gudanar da SQL ɗaya.

## What is in this patch (copy over your project, same paths)
| File | |
|---|---|
| `src/components/MissionEngine.jsx` | **FIX** (one line: each challenge is keyed, so two games of the same type never share state) |
| `src/data/solarMission.js` `robotMission.js` `deviceMission.js` | **NEW** missions 05, 06, 07 |
| `src/data/registry.js` `src/data/missions.js` | **CHANGED**: register the missions, unlock them, add badges Solar Pioneer, Robot Builder, Home Inventor |
| `supabase/migrations/007_publish_missions_05_07.sql` | **NEW**: puts missions 05–07 (and 3 badges) in your database as published |
| `scripts/generate-seed.mjs` | **CHANGED**: also generates 007 |
| `scripts/check-missions.mjs` | **NEW**: `node scripts/check-missions.mjs` checks all 7 missions (Hausa + English everywhere, steps exist, answers valid, reward keys) |
| `supabase/migrations/003_seed_content.sql` | regenerated so a **fresh** database already includes 05–07. **Do not re-run it on an existing database.** |

## Steps
1. Copy the files over your project. No `npm install` needed (no new packages).
2. **Only if you use Supabase:** run `007_publish_missions_05_07.sql` in the SQL Editor (needs 001–006). Safe to run twice. The database re-checks Hausa + English before publishing and refuses if anything is missing.
3. `npm run dev`. Dashboard now shows missions 01–07 unlocked.

## About Mission 03 (what was wrong)
The challenge stage of Mission 03 has two sorting games in a row (“resource or product?” then “safe or ask an adult?”). Both use the same game component, and the app reused the first one’s “finished” state for the second. The second game never appeared and the Continue button never showed. Missions with a sorting game followed by the calculator were not affected. Now fixed for every mission, including missions made in the admin builder and the Preview.
If Mission 03 still does not show on the dashboard **after** this fix and you use Supabase, check it in the SQL Editor:
`select slug, status from public.missions order by mission_no;` — `waste` must be `published`. If it is `coming_soon` or has no lesson steps, run `004_refresh_mission_content.sql`, then `update public.missions set status = 'published' where slug = 'waste';` (the database refuses if content is incomplete).

## The new missions
- **05 Solar Energy (Hasken Rana):** sunlight as a resource, panel, battery, charge controller, lamp. Watch/practise a solar lamp system, charging a phone, and panel care. Safety: never look at the sun, no bare wires or mains, adults handle batteries and wiring. Challenges: resource/product, safe/dangerous, business calculator.
- **06 Build a Simple Robot (Gina Ƙaramin Mutum-mutumi):** battery, wires, switch, motor, wheels, sensor, controller. Watch/practise how power travels, sense → think → act, and building a toy robot car. Safety: only small batteries, never mains, adults cut, hot-glue and solder. Challenges: sort parts by job (3 groups), safe/ask an adult.
- **07 Build a Device for a Home Problem (Gina Na’ura don Matsalar Gida):** the inventor steps, pot-in-pot cooler, foot-pedal hand-washing station, bottle drip watering. Safety: adults cut, drill, use fire or boil; never chemical bottles. Challenges: problem/solution, safe/ask an adult, business calculator.

## Honest notes
- The Hausa was written in simple language for ages 8–14, but please have a Hausa speaker (teacher/parent) read it. Technical words (sensor, controller, solar) may differ by region; fix them in the three mission files.
- The steps are simplified teaching versions. Have an electrician or engineer check missions 05 and 06, and a food-safety/health person check mission 07, before launch.
- Everything stays a game: real wiring, cutting, drilling, heat and batteries are shown as adult-supervised.
- I could not run the app or the SQL here (no internet). The mission data passes the checker, and all files parse.
