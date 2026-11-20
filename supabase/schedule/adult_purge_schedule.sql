-- ASARTUN ADULT LEARNING — schedule the daily purge job.   STATUS: written, NEVER RUN.
-- This file is deliberately NOT in supabase/migrations: it needs values only you have, and it must not run by accident.
--
-- What the job does (supabase/functions/adult-purge): deletes photos and handwriting of classes closed MORE THAN 2 MONTHS ago
-- (files first through the storage API, database rows only after the files are gone), then removes old sign-up / code / wrong-PIN
-- attempt records, and writes one 'purge' line to adult_audit_log so you can see that it ran.
--
-- BEFORE running this file:
--   1. Deploy the function WITHOUT login checking (the scheduler is not a signed-in user; the secret header protects it):
--        supabase functions deploy adult-purge --no-verify-jwt
--   2. Set a long random secret for the function (24+ characters):
--        supabase secrets set PURGE_SECRET=<long random string>
--   3. In Supabase: Database → Extensions → enable  pg_cron  and  pg_net.
--   4. Replace <PROJECT_REF> below with your project reference, and <SAME_PURGE_SECRET> with the SAME secret as step 2.
--      (Run this file in the SQL editor; do not commit it with the real secret in it.)

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- keep the secret in Supabase Vault, not in the schedule text
select vault.create_secret('<SAME_PURGE_SECRET>', 'adult_purge_secret');

-- every day at 03:00 UTC (04:00 in Nigeria)
select cron.schedule(
  'adult-purge-daily',
  '0 3 * * *',
  $job$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/adult-purge',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-purge-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'adult_purge_secret')),
    body    := '{}'::jsonb
  );
  $job$
);

-- To check that it ran:   select * from cron.job_run_details order by start_time desc limit 5;
--                         select * from public.adult_audit_log where action = 'purge' order by at desc limit 5;
-- To stop it:             select cron.unschedule('adult-purge-daily');
