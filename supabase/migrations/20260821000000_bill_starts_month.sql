-- Supports adding a new bill mid-cycle after its due date already passed
-- this month (e.g. joining a gym membership on the 18th when it bills on
-- the 3rd) without it appearing as an owed/unpaid item for a cycle that was
-- never really yours. NULL means no restriction — visible every month, same
-- as before this column existed.
alter table public.bills
  add column if not exists starts_month_key text;
