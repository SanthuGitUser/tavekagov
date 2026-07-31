-- Remove the unused legacy table after confirming it is no longer needed.
-- This does NOT affect public.tn_press_release, the table used by the current
-- TN DIPR press-release sync.
--
-- Run the preflight query first. If `legacy_table` is not null, run the
-- following count query separately. If it is non-zero and you need the data,
-- export it before executing the transaction below.

select to_regclass('public.press_releases') as legacy_table;

-- Run only when legacy_table is `press_releases`:
-- select count(*) as row_count from public.press_releases;

begin;

-- Drop dependent index, trigger, RLS policies, and table only if it exists.
-- No CASCADE is used: PostgreSQL will stop rather than silently remove any
-- unexpected objects that depend on this table.
drop table if exists public.press_releases;

commit;
