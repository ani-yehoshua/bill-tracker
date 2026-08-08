-- notify_time / utc_offset_minutes / last_sent_date were added to `bills`
-- via the Supabase SQL editor ad hoc and were never checked in. A fresh
-- rebuild of this schema would otherwise produce a DB where
-- /api/push/sync-bills and the reminders cron both fail on unknown columns.
alter table public.bills
  add column if not exists notify_time        text not null default '09:00',
  add column if not exists utc_offset_minutes  int  not null default 0,
  add column if not exists last_sent_date      date;
