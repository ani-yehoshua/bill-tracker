-- Removes the Plaid bank-connection schema (added in
-- 20260821010000_plaid_balance_linked_rings and 20260905000000_plaid_transactions).
-- The integration was abandoned before production access; only sandbox
-- test data existed in these tables. budget_rings is restored to its
-- original shape from 20260804010000.

-- Column first: budget_rings.linked_bank_account_id references bank_accounts.
alter table public.budget_rings
  drop column if exists linked_bank_account_id,
  drop column if exists starting_balance;

drop table if exists public.bank_transactions;
drop table if exists public.bank_balance_snapshots;
drop table if exists public.bank_accounts;
drop table if exists public.plaid_items;

alter table public.budget_rings drop constraint if exists budget_rings_kind_check;
alter table public.budget_rings add constraint budget_rings_kind_check
  check (kind in ('spend', 'save'));

alter table public.budget_rings drop constraint if exists budget_rings_period_check;
alter table public.budget_rings add constraint budget_rings_period_check
  check (period in ('monthly', 'weekly', 'yearly'));
