-- Phase 2 gap closure: budget_rings/expenses/paychecks were created in
-- 20260804010000 as forward-looking tables but never added to the realtime
-- publication (only bills/bill_paid were), and budget_rings has no
-- updated_at trigger.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budget_rings'
  ) then
    alter publication supabase_realtime add table public.budget_rings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table public.expenses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paychecks'
  ) then
    alter publication supabase_realtime add table public.paychecks;
  end if;
end $$;

alter table public.budget_rings replica identity full;
alter table public.expenses     replica identity full;
alter table public.paychecks    replica identity full;

drop trigger if exists budget_rings_updated_at on public.budget_rings;
create trigger budget_rings_updated_at before update on public.budget_rings
  for each row execute function public.update_updated_at();
